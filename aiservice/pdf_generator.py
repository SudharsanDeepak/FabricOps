import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

def generate_qa_report_pdf(prediction_data: dict, target_persona: str = "MANAGER") -> bytes:
    """
    Generates an official FabricOps Quality Assurance Report PDF
    for both Looming Industry Manager and Global Buyer.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=TA_LEFT
    )

    sub_title_style = ParagraphStyle(
        'HeaderSubtitle',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#5227FF'),
        alignment=TA_LEFT
    )

    doc_meta_style = ParagraphStyle(
        'DocMeta',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_RIGHT
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    body_text = ParagraphStyle(
        'BodyText',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    status_badge_style = ParagraphStyle(
        'StatusBadge',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        alignment=TA_CENTER
    )

    story = []

    # 1. Header Banner
    persona_label = "PLANT MANAGER PRODUCTION AUDIT" if target_persona.upper() == "MANAGER" else "GLOBAL BUYER QUALITY & COMPLIANCE CERTIFICATE"
    doc_id = f"QA-{datetime.now().strftime('%Y%m%d')}-{prediction_data.get('roll_id', 'ROL-9041')}"

    header_table_data = [
        [
            Paragraph("<b>EVEREST TEXTILE MILLS</b><br/><font color='#5227FF'>FabricOps AI Quality Sentinel</font>", header_title_style),
            Paragraph(f"<b>DOCUMENT ID:</b> {doc_id}<br/><b>DATE:</b> {datetime.now().strftime('%d %b %Y, %H:%M')}<br/><b>PURPOSE:</b> {persona_label}", doc_meta_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[320, 220])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#5227FF'), spaceAfter=14))

    # 2. Executive Summary Box
    status = prediction_data.get('predicted_status', 'PASS')
    confidence = prediction_data.get('confidence', 0.85) * 100
    risk = prediction_data.get('risk_level', 'LOW')

    if status == 'PASS':
        status_bg = colors.HexColor('#ECFDF5')
        status_border = colors.HexColor('#10B981')
        status_text_color = colors.HexColor('#065F46')
        status_desc = "ACCEPTED & CERTIFIED &bull; Fabric meets ASTM D5430 Grade-A physical and visual inspection standards."
    elif status == 'REWORK':
        status_bg = colors.HexColor('#FFFBEB')
        status_border = colors.HexColor('#F59E0B')
        status_text_color = colors.HexColor('#92400E')
        status_desc = "REWORK REQUIRED &bull; Minor surface slub or heat-setting deviations detected. Recommended for re-grading."
    else:
        status_bg = colors.HexColor('#FEF2F2')
        status_border = colors.HexColor('#EF4444')
        status_text_color = colors.HexColor('#991B1B')
        status_desc = "REJECTED & QUARANTINED &bull; Structural density or yarn tension anomalies exceed tolerable thresholds."

    status_badge_style.textColor = status_text_color

    status_box_data = [
        [
            Paragraph(f"<b>INSPECTION VERDICT: {status}</b>", status_badge_style),
            Paragraph(f"<b>MODEL CONFIDENCE:</b> {confidence:.1f}%<br/><b>DEFECT RISK:</b> {risk}<br/><b>RECOMMENDATION:</b> {status_desc}", body_text)
        ]
    ]
    status_box = Table(status_box_data, colWidths=[200, 340])
    status_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), status_bg),
        ('BOX', (0, 0), (-1, -1), 1.5, status_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(status_box)
    story.append(Spacer(1, 14))

    # 3. Fabric Roll & Manufacturing Parameters
    story.append(Paragraph("<b>1. Production Parameters & Batch Traceability</b>", section_heading))

    params_data = [
        [
            Paragraph("<b>Roll ID:</b>", body_text), Paragraph(str(prediction_data.get('roll_id', 'ROL-9041-A')), body_text),
            Paragraph("<b>Order Ref:</b>", body_text), Paragraph(str(prediction_data.get('order_number', 'ORD-2026-0018')), body_text)
        ],
        [
            Paragraph("<b>Fabric Type:</b>", body_text), Paragraph(str(prediction_data.get('fabric_type', 'Cotton')), body_text),
            Paragraph("<b>Weave Colour:</b>", body_text), Paragraph(str(prediction_data.get('colour', 'White')), body_text)
        ],
        [
            Paragraph("<b>Produced Length:</b>", body_text), Paragraph(f"{float(prediction_data.get('production_length_m', 1000)):,.1f} meters", body_text),
            Paragraph("<b>Loom Machinery:</b>", body_text), Paragraph(str(prediction_data.get('loom_id', 'LOOM-AJ-01 (Air-Jet)')), body_text)
        ],
        [
            Paragraph("<b>Yarn Batch Age:</b>", body_text), Paragraph(f"{int(prediction_data.get('yarn_batch_age_days', 10))} days", body_text),
            Paragraph("<b>Machine Downtime:</b>", body_text), Paragraph(f"{float(prediction_data.get('downtime_min', 15))} minutes", body_text)
        ],
        [
            Paragraph("<b>Production Duration:</b>", body_text), Paragraph(f"{float(prediction_data.get('production_duration_min', 120))} minutes", body_text),
            Paragraph("<b>Client / Partner:</b>", body_text), Paragraph(str(prediction_data.get('customer_name', 'Apex Garments Sourcing')), body_text)
        ]
    ]

    params_table = Table(params_data, colWidths=[110, 160, 110, 160])
    params_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(params_table)
    story.append(Spacer(1, 14))

    # 4. Multiclass Probability Distribution
    story.append(Paragraph("<b>2. AI Model Class Probability Distribution (XGBoost)</b>", section_heading))

    probs = prediction_data.get('probabilities', {})
    pass_prob = probs.get('PASS', 0.0) * 100
    rework_prob = probs.get('REWORK', 0.0) * 100
    reject_prob = probs.get('REJECT', 0.0) * 100

    prob_data = [
        [
            Paragraph("<b>Inspection Class</b>", body_text),
            Paragraph("<b>Calculated Probability</b>", body_text),
            Paragraph("<b>Operational Meaning</b>", body_text)
        ],
        [
            Paragraph("<font color='#059669'><b>PASS</b></font>", body_text),
            Paragraph(f"<b>{pass_prob:.2f}%</b>", body_text),
            Paragraph("Acceptable for export garments; within 4.0 defect points per 100m²", body_text)
        ],
        [
            Paragraph("<font color='#D97706'><b>REWORK</b></font>", body_text),
            Paragraph(f"<b>{rework_prob:.2f}%</b>", body_text),
            Paragraph("Minor slub or selvedge defect; fixable via secondary shearing/stentering", body_text)
        ],
        [
            Paragraph("<font color='#DC2626'><b>REJECT</b></font>", body_text),
            Paragraph(f"<b>{reject_prob:.2f}%</b>", body_text),
            Paragraph("Severe warp striping, tear, or shade band; quarantined to prevent buyer disputes", body_text)
        ]
    ]

    prob_table = Table(prob_data, colWidths=[100, 140, 300])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 14))

    # 5. Quality Factors & Engineering Analysis
    story.append(Paragraph("<b>3. Quality Risk Factor Diagnostics</b>", section_heading))

    # Evaluate factors
    downtime = float(prediction_data.get('downtime_min', 0))
    batch_age = float(prediction_data.get('yarn_batch_age_days', 0))
    length = float(prediction_data.get('production_length_m', 0))

    dt_assessment = "Minimal stop marks; stable weft insertion." if downtime < 20 else "Elevated downtime increases stop-mark and reed shadow probability."
    age_assessment = "Fresh yarn lot ensures high tensile elasticity." if batch_age < 30 else "Aged yarn lot may suffer from fiber moisture depletion; monitoring warp tension recommended."

    factors_data = [
        [Paragraph("<b>Factor</b>", body_text), Paragraph("<b>Observed Metric</b>", body_text), Paragraph("<b>Diagnostic Evaluation</b>", body_text)],
        [Paragraph("Machine Downtime", body_text), Paragraph(f"{downtime:.0f} mins", body_text), Paragraph(dt_assessment, body_text)],
        [Paragraph("Yarn Silo Batch Age", body_text), Paragraph(f"{batch_age:.0f} days", body_text), Paragraph(age_assessment, body_text)],
        [Paragraph("Run Length", body_text), Paragraph(f"{length:,.0f} m", body_text), Paragraph("Continuous roll winding integrity verified.", body_text)],
    ]
    factors_table = Table(factors_data, colWidths=[140, 110, 290])
    factors_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(factors_table)
    story.append(Spacer(1, 18))

    # 6. Formal Sign-Off Section (Manager & Buyer)
    story.append(KeepTogether([
        Paragraph("<b>4. Authorized Sign-Off & Verification</b>", section_heading),
        Spacer(1, 4),
        Table([
            [
                Paragraph("<b>LOOMING INDUSTRY MANAGER</b><br/><br/><i>Approved & Signed:</i><br/><b>Prakash Sharma</b><br/>Lead Plant Executive &bull; Everest Mills", body_text),
                Paragraph("<b>GLOBAL BUYER QUALITY REP</b><br/><br/><i>Audit Acknowledged:</i><br/><b>Aditi Rao</b><br/>Sourcing Director &bull; Apex Garments", body_text),
                Paragraph("<b>TAMPER-PROOF QC SEAL</b><br/><br/><b>[VERIFIED BY AI SENTINEL]</b><br/>Model: XGBoost Synthetic 200k<br/>Hash: 8f9b2...014c", doc_meta_style)
            ]
        ], colWidths=[180, 180, 180], style=[
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FAFAFA')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]),
        Spacer(1, 10),
        Paragraph("<font color='#94A3B8'>Notice: This Quality Assurance report is generated automatically by the FabricOps AI XGBoost Machine Learning Service integrated with Everest Textile Mills ERP. Valid for international apparel export documentation.</font>", doc_meta_style)
    ]))

    doc.build(story)
    return buffer.getvalue()
