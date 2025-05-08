# Power Partners, LLC - Transformer Inspection - HMI Configuration

# Database Configuration
database:
  host: '10.1.10.11'
  port: 5432
  username: 'postgres'
  password: 'ussvision1'
  dbname: 'powerpartners_system'


# Image Access
image_access:
  protocol: 'ftp'  # Options: local, sftp, ftp (Ensure this matches .env setting for backend)
  fallback_path: '/public/images'  # Fallback path for development
  # sftp:
  #   host: '10.1.10.11'
  #   username: 'sftp_user'
  #   path: '/mnt' # Base path on SFTP server (might not be used if DB paths are absolute)
  #   # key_filename: '/path/to/id_rsa' # Optional: Path to private key for key-based auth
  #   password: 'ussvision1' # Optional: Password (use .env for backend)
  ftp:
    host: '10.1.10.11' # Example FTP host
    username: 'ussvppathens' # Example FTP username
    password: 'ussvision1' # Store actual password in backend .env (IMAGE_ACCESS_FTP_PASSWORD)

# UI Configuration
ui:
  client: 'Power Partners, LLC'
  site: 'Athens, GA'
  line: 'Line 1'
  max_zoom: 6.0
  app_title: 'Power Partners, LLC - Transformer Inspection - HMI'
  client_logo: '/images/powerpartners.png'
  logo_size: 65

# Feature Flags
features:
  enable_build_code_association: true
  enable_region_selection: true
  enable_region_labeling: true

# Build Code Definition (HV to LV Transformer Inspection)
build_code_fields:
  - id: 'core_lamination'
    name: 'Core Lamination'
    description: 'Inspection of transformer core laminations'
    examples: ['CL-P1', 'CL-M2', 'CL-F3', 'CL-D1', 'CL-P2', 'CL-M3', 'CL-F2', 'CL-D4', 'CL-S1']
  
  - id: 'winding_integrity'
    name: 'Winding Integrity'
    description: 'Inspection of primary and secondary windings'
    examples: ['WI-OK', 'WI-DMG', 'WI-RPR', 'WI-REP', 'WI-HTC', 'WI-BRN', 'WI-LSE', 'WI-CRC', 'WI-TMP']
  
  - id: 'insulation_condition'
    name: 'Insulation Condition'
    description: 'Condition of internal insulation materials'
    examples: ['IC-A1', 'IC-B2', 'IC-C3', 'IC-F1', 'IC-A2', 'IC-B3', 'IC-D1', 'IC-E2', 'IC-H3', 'IC-G1']
  
  - id: 'bushing_status'
    name: 'Bushing Status'
    description: 'Condition of HV and LV bushings'
    examples: ['BS-CLN', 'BS-CRK', 'BS-DRT', 'BS-LKG', 'BS-FLH', 'BS-CHP', 'BS-CNT', 'BS-OVH', 'BS-CRN', 'BS-ABR']
  
  - id: 'tap_changer'
    name: 'Tap Changer'
    description: 'Condition and position of tap changer mechanism'
    examples: ['TC-N2', 'TC-P1', 'TC-F3', 'TC-J5', 'TC-N3', 'TC-S1', 'TC-L4', 'TC-K2', 'TC-M3', 'TC-R5', 'TC-W1']
  
  - id: 'oil_quality'
    name: 'Oil Quality'
    description: 'Quality assessment of transformer oil'
    examples: ['OQ-NEW', 'OQ-FLT', 'OQ-CND', 'OQ-RPL', 'OQ-H2O', 'OQ-ACD', 'OQ-TAN', 'OQ-CLR', 'OQ-PRF', 'OQ-SLG']
  
  - id: 'gasket_seal'
    name: 'Gasket Seal'
    description: 'Condition of gaskets and seals'
    examples: ['GS-INT', 'GS-LKG', 'GS-AGD', 'GS-RPR', 'GS-CRK', 'GS-BLG', 'GS-DRY', 'GS-DEF', 'GS-HRD', 'GS-PTL']
  
  - id: 'cooling_system'
    name: 'Cooling System'
    description: 'Operational status of cooling systems'
    examples: ['CS-OPR', 'CS-FLT', 'CS-MNT', 'CS-BYP', 'CS-FAN', 'CS-PMP', 'CS-RAD', 'CS-CNT', 'CS-TMP', 'CS-CLG', 'CS-DRT']
  
  - id: 'grounding_connection'
    name: 'Grounding Connection'
    description: 'Condition of grounding/earthing connections'
    examples: ['GC-SEC', 'GC-COR', 'GC-LSE', 'GC-MSN', 'GC-TGT', 'GC-OXD', 'GC-BRK', 'GC-RST', 'GC-STD', 'GC-IMP']
  
  - id: 'pressure_relief'
    name: 'Pressure Relief'
    description: 'Status of pressure relief devices'
    examples: ['PR-NRM', 'PR-OPN', 'PR-LKG', 'PR-STK', 'PR-DMG', 'PR-RPL', 'PR-CLG', 'PR-TST', 'PR-OPR', 'PR-FLT']
  
  - id: 'temperature_gauge'
    name: 'Temperature Gauge'
    description: 'Functionality of temperature monitoring devices'
    examples: ['TG-OPR', 'TG-FLT', 'TG-HGH', 'TG-LOW', 'TG-CAL', 'TG-BRK', 'TG-RPL', 'TG-INP', 'TG-DGT', 'TG-ANL']
  
  - id: 'conservator_tank'
    name: 'Conservator Tank'
    description: 'Condition of oil conservator tank'
    examples: ['CT-GUD', 'CT-LKG', 'CT-LVL', 'CT-CRK', 'CT-DSC', 'CT-CLN', 'CT-RST', 'CT-DNG', 'CT-BLG', 'CT-PNT']
  
  - id: 'radiator_fins'
    name: 'Radiator Fins'
    description: 'Condition of cooling radiator fins'
    examples: ['RF-CLN', 'RF-BNT', 'RF-BLK', 'RF-CRK', 'RF-LKG', 'RF-DMG', 'RF-RST', 'RF-RPL', 'RF-FLW', 'RF-EXP']
  
  - id: 'breather_silica'
    name: 'Breather Silica'
    description: 'Condition of silica gel in breather'
    examples: ['BS-BLU', 'BS-PNK', 'BS-WHT', 'BS-MXD', 'BS-SAT', 'BS-DRY', 'BS-RPL', 'BS-LVL', 'BS-CLG', 'BS-CNT']
  
  - id: 'buchholz_relay'
    name: 'Buchholz Relay'
    description: 'Status of Buchholz gas relay'
    examples: ['BR-NRM', 'BR-ALM', 'BR-TRP', 'BR-GAS', 'BR-OIL', 'BR-TST', 'BR-MNT', 'BR-CLN', 'BR-SRV', 'BR-CAL']
  
  - id: 'surge_arrester'
    name: 'Surge Arrester'
    description: 'Condition of surge protection devices'
    examples: ['SA-OPR', 'SA-DMG', 'SA-AGD', 'SA-LSE', 'SA-CRK', 'SA-DRT', 'SA-TST', 'SA-CLN', 'SA-MIS', 'SA-RPL']
  
  - id: 'control_wiring'
    name: 'Control Wiring'
    description: 'Condition of control and monitoring wiring'
    examples: ['CW-INT', 'CW-FRY', 'CW-LSE', 'CW-BRK', 'CW-INS', 'CW-LBL', 'CW-MSL', 'CW-RST', 'CW-CON', 'CW-TID']
  
  - id: 'nameplate_data'
    name: 'Nameplate Data'
    description: 'Legibility and accuracy of nameplate information'
    examples: ['ND-CLR', 'ND-FDD', 'ND-DMG', 'ND-MSS', 'ND-CRR', 'ND-INC', 'ND-RPL', 'ND-DOC', 'ND-PHT', 'ND-ACC']

  - id: 'ignore'
    name: 'Ignore'
    description: 'Ignore'
    examples: ['IGNORE']