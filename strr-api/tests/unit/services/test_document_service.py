from unittest.mock import MagicMock, patch

import pytest

from strr_api.services.document_service import Document, DocumentService, GCPStorageService


@pytest.fixture
def mock_gcp_service():
    """Fixture to mock GCPStorageService."""
    with patch("strr_api.services.document_service.GCPStorageService") as mock:
        yield mock


@pytest.fixture
def mock_document_model():
    """Fixture to mock the Document SQLAlchemy model."""
    with patch("strr_api.services.document_service.Document") as mock:
        yield mock


class TestDocumentService:
    # --- upload_document ---

    def test_upload_document_success(self, mock_gcp_service):
        """Tests uploading a document successfully."""
        mock_gcp_service.upload_registration_document.return_value = "folder/sample_blob.pdf"

        file_name = "test.pdf"
        file_type = "pdf"
        file_contents = b"fake-file-bytes"
        metadata = {"user_id": "123"}

        result = DocumentService.upload_document(
            file_name=file_name,
            file_type=file_type,
            file_contents=file_contents,
            metadata=metadata,
        )

        mock_gcp_service.upload_registration_document.assert_called_once_with(
            file_type, file_contents, metadata=metadata
        )
        assert result == {
            "fileName": "test.pdf",
            "fileType": "pdf",
            "fileKey": "folder/sample_blob.pdf",
        }

    # --- delete_document ---

    def test_delete_document_success(self, mock_gcp_service):
        """Tests deleting a document successfully."""
        document_path = "folder/sample_blob.pdf"

        result = DocumentService.delete_document(document_path)

        mock_gcp_service.delete_registration_document.assert_called_once_with(document_path)
        assert result is True

    # --- get_registration_documents ---

    def test_get_registration_documents_returns_list(self, mock_document_model):
        """Tests fetching all documents for a given registration_id."""
        fake_doc1 = MagicMock()
        fake_doc2 = MagicMock()
        mock_document_model.query.filter.return_value.all.return_value = [fake_doc1, fake_doc2]

        registration_id = 10

        result = DocumentService.get_registration_documents(registration_id)

        assert len(result) == 2
        assert result == [fake_doc1, fake_doc2]

    # --- get_registration_document ---

    def test_get_registration_document_found(self, mock_document_model):
        """Tests fetching a single document when it exists."""
        fake_doc = MagicMock()
        # Chained filter calls: Document.query.filter(...).filter(...).one_or_none()
        mock_document_model.query.filter.return_value.filter.return_value.one_or_none.return_value = fake_doc

        result = DocumentService.get_registration_document(registration_id=10, document_id=1)

        assert result == fake_doc

    def test_get_registration_document_not_found(self, mock_document_model):
        """Tests fetching a single document when it does not exist."""
        mock_document_model.query.filter.return_value.filter.return_value.one_or_none.return_value = None

        result = DocumentService.get_registration_document(registration_id=10, document_id=999)

        assert result is None

    # --- get_registration_document_by_key ---

    def test_get_registration_document_by_key_single_match(self, mock_document_model):
        """Tests getting a document by file key when a single match exists."""
        fake_doc = MagicMock(id=1, path="folder/blob.pdf")

        # Mocking the query chain: query.filter().filter().first()
        mock_document_model.query.filter.return_value.filter.return_value.first.return_value = fake_doc

        result = DocumentService.get_registration_document_by_key(registration_id=10, file_key="folder/blob.pdf")

        assert result == fake_doc
        assert result.id == 1

    def test_get_registration_document_by_key_duplicate_paths_returns_first(self, mock_document_model):
        """Edge Case: Tests that when multiple documents share the same path, .first() returns the first record."""
        doc_1 = MagicMock(id=101, path="folder/duplicate_blob.pdf")
        doc_2 = MagicMock(id=102, path="folder/duplicate_blob.pdf")

        # Simulate database behavior where .first() picks the first element from matching results
        matching_results = [doc_1, doc_2]
        mock_document_model.query.filter.return_value.filter.return_value.first.side_effect = lambda: (
            matching_results[0] if matching_results else None
        )

        result = DocumentService.get_registration_document_by_key(
            registration_id=10, file_key="folder/duplicate_blob.pdf"
        )

        # Asserts it retrieved the first match specifically (id=101)
        assert result == doc_1
        assert result.id == 101
        assert result.id != doc_2.id

    def test_get_registration_document_by_key_not_found(self, mock_document_model):
        """Tests behavior when no document matches the given key."""
        mock_document_model.query.filter.return_value.filter.return_value.first.return_value = None

        result = DocumentService.get_registration_document_by_key(registration_id=10, file_key="non_existent.pdf")

        assert result is None

    # --- get_file_by_key ---

    def test_get_file_by_key_success(self, mock_gcp_service):
        """Tests fetching raw file content from GCP using file key."""
        mock_gcp_service.fetch_registration_document.return_value = b"raw-file-data"

        file_key = "folder/sample_blob.pdf"
        result = DocumentService.get_file_by_key(file_key)

        mock_gcp_service.fetch_registration_document.assert_called_once_with(blob_name=file_key)
        assert result == b"raw-file-data"
