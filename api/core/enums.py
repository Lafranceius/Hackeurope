from enum import Enum


class ScreenCategory(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueType(str, Enum):
    STRUCTURE = "structure"
    TYPE = "type"
    SEMANTIC = "semantic"
    MISSINGNESS = "missingness"
    INTEGRITY = "integrity"
    AMBIGUITY = "ambiguity"
    METADATA = "metadata"
    RISK = "risk"


class RiskMode(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ProcessingStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"
    NEEDS_INPUT = "needs_input"
