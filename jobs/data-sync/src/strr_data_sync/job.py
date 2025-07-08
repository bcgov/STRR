# Copyright © 2024 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Job to sync data."""
import csv
import os
from datetime import datetime
from pathlib import Path
from typing import List

import pandas as pd
from flask import Flask
from jinja2 import Template
from sqlalchemy.sql.expression import text
from strr_api.models import db
from strr_api.services import AuthService, RestService

from strr_data_sync.config import CONFIGURATION
from strr_data_sync.utils.logging import setup_logging

setup_logging("logging.conf")

QUERY_1_TEMPLATE = """
SELECT
  val.id,
  reg.registration_number,
  reg.status,
  Val.status_code,
  (
  SELECT
    jsonb_agg(reps->>'code')
  FROM
    jsonb_array_elements(val.response_json->'errors') AS reps) AS errors,
  val.request_json ->'address' ->> 'streetNumber' AS request_street_number,
  val.request_json ->'address' ->> 'unitNumber' AS request_unit_number,
  val.request_json ->'address' ->> 'postalCode' AS request_postal_code,
  a.street_number AS reg_Street_number,
  a.unit_number AS reg_unit_number,
  a.postal_code AS reg_postal_code,
  u.username AS username,
  val.created AS request_time
FROM
  addresses a,
  real_time_validation val,
  registrations reg,
  rental_properties rp,
  users u
WHERE
  reg.registration_number = val.request_json->> 'identifier'
  AND rp.registration_id = reg.id
  AND reg.registration_type='HOST'
  AND a.id = rp.address_id
  AND u.id=val.created_by_id
  AND val.created>= NOW() - INTERVAL '24 hours'
ORDER BY val.created DESC
LIMIT {limit} OFFSET {offset}
"""

QUERY_2_TEMPLATE = """
SELECT
  u.username AS username,
  val.status_code,
  count(*) as count
FROM
  real_time_validation val,
  users u
WHERE
  u.id=val.created_by_id
  AND val.created>= NOW() - INTERVAL '24 hours'
GROUP BY
  u.username,
  val.status_code
LIMIT {limit} OFFSET {offset}
"""

QUERY_3_TEMPLATE = """
SELECT
  DISTINCT(REG.SBC_ACCOUNT_ID)
FROM
  REAL_TIME_VALIDATION VAL,
  REGISTRATIONS REG
WHERE
  REG.REGISTRATION_NUMBER = VAL.REQUEST_JSON ->> 'identifier'
  AND VAL.STATUS_CODE != '200'
  AND VAL.CREATED >= NOW() - INTERVAL '24 hours'
LIMIT {limit} OFFSET {offset}
"""

QUERY_4_TEMPLATE = """
SELECT
  r.registration_number,
  r.start_date AS registration_date,
  addr.unit_number AS unit_number,
  addr.street_number AS street_number,
  addr.street_address AS street_address,
  addr.city AS city,
  addr.postal_code AS postal_code,
  CONCAT_WS(' ',
    addr.unit_number,
    addr.street_number,
    addr.street_address,
    addr.city,
    addr.postal_code ) AS full_address,
  a.application_json -> 'registration' -> 'primaryContact' ->> 'emailAddress' AS host_email,
  a.application_json -> 'registration' -> 'secondaryContact' ->> 'emailAddress' AS cohost_email,
  c.email AS property_manager_email
FROM
  application a
LEFT JOIN
  registrations r
ON
  a.registration_id = r.id
LEFT JOIN
  rental_properties rp
ON
  rp.registration_id = r.id
LEFT JOIN
  addresses addr
ON
  rp.address_id = addr.id
LEFT JOIN
  property_manager pm
ON
  pm.id = rp.property_manager_id
LEFT JOIN
  contacts c
ON
  c.id = pm.primary_contact_id
WHERE
  r.registration_type='HOST'
ORDER BY r.start_date
LIMIT {limit} OFFSET {offset}
"""


def create_app(run_mode=os.getenv("FLASK_ENV", "production")):
    """Return a configured Flask App using the Factory method."""
    app = Flask(__name__)
    app.config.from_object(CONFIGURATION[run_mode])
    db.init_app(app)

    register_shellcontext(app)

    return app


def register_shellcontext(app):
    """Register shell context objects."""

    def shell_context():
        """Shell context objects."""
        return {"app": app}

    app.shell_context_processor(shell_context)


def run():
    """Execute queries with pagination and send results."""
    application = create_app()
    with application.app_context():
        application.logger.info("STRR Data Sync job starting.")
        
        # Create output directory
        output_dir = Path(application.config.get('CSV_OUTPUT_PATH'))
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M")
        
        # Execute queries with pagination and save to CSV
        query1_files = _execute_paginated_query(
            application, QUERY_1_TEMPLATE, f"query1_results_{timestamp}", output_dir
        )
        query2_files = _execute_paginated_query(
            application, QUERY_2_TEMPLATE, f"query2_results_{timestamp}", output_dir
        )
        query3_files = _execute_paginated_query(
            application, QUERY_3_TEMPLATE, f"query3_results_{timestamp}", output_dir
        )
        query4_files = _execute_paginated_query(
            application, QUERY_4_TEMPLATE, f"query4_results_{timestamp}", output_dir
        )
        
        # Merge CSV files for each query
        merged_files = {}
        merged_files['query1'] = _merge_csv_files(application, query1_files, f"query1_merged_{timestamp}.csv", output_dir)
        merged_files['query2'] = _merge_csv_files(application, query2_files, f"query2_merged_{timestamp}.csv", output_dir)
        merged_files['query3'] = _merge_csv_files(application, query3_files, f"query3_merged_{timestamp}.csv", output_dir)
        merged_files['query4'] = _merge_csv_files(application, query4_files, f"query4_merged_{timestamp}.csv", output_dir)
        
        # Apply username replacements to query1 and query2
        if merged_files['query1']:
            processed_q1 = _replace_usernames(application, merged_files['query1'], f"query1_processed_{timestamp}.csv", output_dir)
            merged_files['query1_processed'] = processed_q1
            
        if merged_files['query2']:
            processed_q2 = _replace_usernames(application, merged_files['query2'], f"query2_processed_{timestamp}.csv", output_dir)
            merged_files['query2_processed'] = processed_q2
        
        # Generate summary statistics for email
        summary_stats = _generate_summary_stats(application, merged_files)
        
        # Send summary email
        _send_summary_email(application, summary_stats, merged_files, timestamp)

        application.logger.info("STRR Data Sync job finished.")


def _execute_paginated_query(app: Flask, query_template: str, base_filename: str, output_dir: Path) -> List[Path]:
    """Execute a query with pagination and save results to CSV files."""
    batch_size = app.config.get('BATCH_SIZE')
    max_results = app.config.get('MAX_RESULTS')
    csv_files = []
    
    offset = 0
    batch_num = 0
    
    while offset < max_results:
        try:
            query = query_template.format(limit=batch_size, offset=offset)
            result_set = db.session.execute(text(query))
            results = result_set.fetchall()
            
            if not results:
                app.logger.info(f"No more results found at offset {offset}")
                break
                
            # Save to CSV
            csv_filename = output_dir / f"{base_filename}_batch_{batch_num:03d}.csv"
            _save_results_to_csv(results, csv_filename, result_set.keys())
            csv_files.append(csv_filename)
            
            app.logger.info(f"Batch {batch_num}: Retrieved {len(results)} rows, saved to {csv_filename}")
            
            if len(results) < batch_size:
                app.logger.info("Retrieved fewer results than batch size, stopping pagination")
                break
                
            offset += batch_size
            batch_num += 1
            
        except Exception as e:
            app.logger.error(f"Error executing query at offset {offset}: {e}")
            break
    
    return csv_files


def _save_results_to_csv(results, csv_filename: Path, column_names):
    """Save query results to a CSV file."""
    with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Write header
        writer.writerow(column_names)
        
        # Write data rows
        for row in results:
            writer.writerow(row)


def _merge_csv_files(app: Flask, csv_files: List[Path], output_filename: str, output_dir: Path) -> Path:
    """Merge multiple CSV files into one."""
    if not csv_files:
        app.logger.warning("No CSV files to merge")
        return None
        
    try:
        # Read and concatenate all files
        df_list = [pd.read_csv(file, dtype=str) for file in csv_files]
        merged_df = pd.concat(df_list, ignore_index=True)
        
        # Save the merged DataFrame
        output_path = output_dir / output_filename
        merged_df.to_csv(output_path, index=False)
        
        app.logger.info(f"Successfully merged {len(csv_files)} files into {output_path}")
        
        # Clean up individual batch files
        for file in csv_files:
            file.unlink()
            
        return output_path
        
    except Exception as e:
        app.logger.error(f"Error merging CSV files: {e}")
        return None


def _replace_usernames(app: Flask, input_file: Path, output_filename: str, output_dir: Path) -> Path:
    """Replace usernames in CSV file based on replacement mapping."""
    if not input_file or not input_file.exists():
        app.logger.warning(f"Input file {input_file} does not exist")
        return None
        
    try:
        replacements = app.config.get('USERNAME_REPLACEMENTS', {})
        output_path = output_dir / output_filename
        
        with open(input_file, 'r', encoding='utf-8', newline='') as infile:
            reader = csv.reader(infile)
            
            with open(output_path, 'w', encoding='utf-8', newline='') as outfile:
                writer = csv.writer(outfile)
                
                # Read header and find username column
                header = next(reader)
                writer.writerow(header)
                
                try:
                    username_col_index = header.index('username')
                except ValueError:
                    app.logger.warning("'username' column not found, copying file as-is")
                    # Copy remaining rows without modification
                    for row in reader:
                        writer.writerow(row)
                    return output_path
                
                # Process each row
                for row in reader:
                    if username_col_index < len(row):
                        username = row[username_col_index]
                        if username in replacements:
                            row[username_col_index] = replacements[username]
                    writer.writerow(row)
        
        app.logger.info(f"Successfully processed usernames and saved to {output_path}")
        return output_path
        
    except Exception as e:
        app.logger.error(f"Error replacing usernames: {e}")
        return None


def _generate_summary_stats(app: Flask, merged_files: dict) -> dict:
    """Generate summary statistics from the merged files."""
    stats = {}
    
    for query_name, file_path in merged_files.items():
        if file_path and file_path.exists():
            try:
                df = pd.read_csv(file_path)
                stats[query_name] = {
                    'total_rows': len(df),
                    'file_path': str(file_path),
                    'file_size_mb': round(file_path.stat().st_size / (1024 * 1024), 2)
                }
            except Exception as e:
                app.logger.error(f"Error generating stats for {query_name}: {e}")
                stats[query_name] = {'error': str(e)}
        else:
            stats[query_name] = {'total_rows': 0, 'file_path': 'Not generated'}
    
    return stats


def _send_summary_email(app: Flask, summary_stats: dict, merged_files: dict, timestamp: str):
    """Send summary email with statistics and file information."""
    try:
        token = AuthService.get_service_client_token()
        template_path = Path(f"{app.config.get('EMAIL_TEMPLATE_PATH')}/summary_report.html")
        filled_template = template_path.read_text(encoding="utf-8")
        email_template = Template(filled_template, autoescape=True)

        template_vars = {
            "report_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "timestamp": timestamp,
            "summary_stats": summary_stats,
            "merged_files": merged_files
        }
        html_out = email_template.render(template_vars)

        email_dict = {
            "recipients": "test@example.com",  # Replace with actual recipient list
            "content": {
                "subject": f"Daily Data Sync Report - {timestamp}", 
                "body": html_out, 
                "attachments": []
            },
        }

        if email_dict:
            send_email(app, email_dict, token=token)

    except Exception as exception:
        app.logger.error("Failed to send summary email", exc_info=exception)
        raise exception


def send_email(app: Flask, notify_body: dict, token: str):
    """Send the email asynchronously, using the given details."""
    app.logger.info(f'send_email to {notify_body.get("recipients")}')
    notify_url = app.config.get("NOTIFY_API_URL") + "/notify/"
    RestService.post(notify_url, token=token, data=notify_body)
    app.logger.info(f'Email sent to {notify_body.get("recipients")}') 