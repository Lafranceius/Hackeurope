from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .enums import IssueType, ProcessingStatus, RiskMode, ScreenCategory, Severity


class SheetProfile(BaseModel):
    sheet_name: str
    used_range: str
    blank_rows: int
    blank_cols: int
    merged_cells_count: int
    comments_count: int
    formulas_count: int
    probable_title_rows: int
    document_like: bool


class TableCandidate(BaseModel):
    sheet_name: str
    range_ref: str
    tabularity_score: float
    header_row_index: int
    header_confidence: float


class TableProfile(BaseModel):
    sheet_name: str
    range_ref: str
    inferred_headers: List[str]
    column_types: Dict[str, str]
    parse_rates: Dict[str, float]
    ambiguous_columns: List[str]
    integrity_risks: List[str]
    complexity_flags: List[str]


class WorkbookSummary(BaseModel):
    filename: str
    file_path: str
    file_size: int
    extension: str
    file_hash: str
    sheet_names: List[str]
    hidden_sheets: List[str]
    total_merged_cells: int
    total_formulas: int


class Issue(BaseModel):
    issue_type: IssueType
    severity: Severity
    description: str
    sheet_name: Optional[str] = None
    column_name: Optional[str] = None


class UploaderQuestion(BaseModel):
    question_text: str
    impacted_sheet: Optional[str] = None
    impacted_column: Optional[str] = None
    why_it_matters: str
    example_choices: List[str]


class ScreeningReport(BaseModel):
    file_path: str
    file_hash: str
    timestamp: datetime = Field(default_factory=datetime.now)
    risk_mode: RiskMode
    workbook_summary: WorkbookSummary
    sheet_summaries: List[SheetProfile]
    detected_tables: List[TableCandidate]
    issues: List[Issue]
    hard_gate_triggers: List[str]
    category: ScreenCategory
    overall_confidence: float
    requires_uploader_input: List[UploaderQuestion]
    review_requirements: List[str]
    recommended_processing_route: str
    safe_actions_possible: List[str]
    screening_notes: str


class ProcessingPlan(BaseModel):
    source_file: str
    screening_report_ref: str
    selected_route: str
    assumptions: List[str]
    user_inputs_used: Dict[str, Any]
    target_output_sheets: List[str]
    planned_transforms: List[str]
    planned_validations: List[str]
    review_policy: str
    stop_conditions: List[str]
    rollback_strategy: str


class TransformResult(BaseModel):
    transform_name: str
    status: str
    details: str


class ProcessingReport(BaseModel):
    source_file: str
    output_file: Optional[str] = None
    status: ProcessingStatus
    processing_plan: ProcessingPlan
    executed_transforms: List[TransformResult]
    technical_verification: Dict[str, Any]
    semantic_verification: Dict[str, Any]
    review_flags: List[str]
    errors: List[str]
    warnings: List[str]
    summary_for_user: str
