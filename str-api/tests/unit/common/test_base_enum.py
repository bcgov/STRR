import unittest
from enum import Enum
from enum import EnumMeta
from typing import Optional

from str_api.common.enum import BaseEnum


# Set up a Test Enum class to perform tests on
class TestEnum(BaseEnum):
    TEST_VALUE = "value"
    TEST_NAME = "name"


# Set up the testing class
class TestBaseEnum(unittest.TestCase):

    def test_get_enum_by_value(self):
        found_value_enum = TestEnum.get_enum_by_value('value')
        found_non_existent_enum = TestEnum.get_enum_by_value('nonexistent')

        self.assertEqual(found_value_enum.TEST_VALUE, 'value')
        self.assertEqual(found_non_existent_enum, None)

    def test_get_enum_by_name(self):
        found_name_enum = TestEnum.get_enum_by_name('TEST_NAME')
        found_non_existent_enum = TestEnum.get_enum_by_name('NON_EXISTENT_NAME')

        self.assertEqual(found_name_enum.TEST_NAME, 'name')
        self.assertEqual(found_non_existent_enum, None)
