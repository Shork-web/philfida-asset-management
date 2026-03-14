export const STATUS_OPTIONS = ['ASSIGNED', 'SPARE', 'OBSOLETE']

export const STATUS_LABELS = {
  ASSIGNED: 'Assigned / In Use',
  SPARE: 'Spare / In Storage',
  OBSOLETE: 'Obsolete / For Disposal',
}

export const TYPE_OPTIONS = [
  'OFFICE_EQUIPMENT',
  'ICT_EQUIPMENT',
  'AGRI_FORESTRY',
  'COMMUNICATION',
  'TECHNICAL',
  'BOOKS',
  'MOTOR_VEHICLES',
  'DISASTER_RESPONSE',
  'FURNITURE_FIXTURES',
  'OTHER_MACHINERY',
]

export const TYPE_LABELS = {
  OFFICE_EQUIPMENT: 'Office Equipment',
  ICT_EQUIPMENT: 'ICT Equipment',
  AGRI_FORESTRY: 'Agri & Forestry',
  COMMUNICATION: 'Communication',
  TECHNICAL: 'Technical',
  BOOKS: 'Books',
  MOTOR_VEHICLES: 'Motor Vehicles',
  DISASTER_RESPONSE: 'Disaster Response',
  FURNITURE_FIXTURES: 'Furniture & Fixtures',
  OTHER_MACHINERY: 'Other Machinery',
}

export const SUBTYPE_OPTIONS = {
  OFFICE_EQUIPMENT: [
    'Photocopier',
    'Scanner',
    'Paper Shredder',
    'Projector',
    'Whiteboard',
    'Binding Machine',
    'Laminator',
    'Typewriter',
    'Calculator',
    'Other',
  ],
  ICT_EQUIPMENT: [
    'Laptop',
    'Desktop',
    'Monitor',
    'Printer',
    'Tablet',
    'Router',
    'Switch',
    'UPS',
    'Powerbank',
    'Server',
    'Hard Drive',
    'Keyboard & Mouse',
    'Webcam',
    'Other',
  ],
  AGRI_FORESTRY: [
    'Tractor',
    'Hand Tractor',
    'Sprayer',
    'Chainsaw',
    'Grass Cutter',
    'Weighing Scale',
    'Seedling Tray',
    'Irrigation Pump',
    'Drying Equipment',
    'Other',
  ],
  COMMUNICATION: [
    'Two-Way Radio',
    'Handheld Radio',
    'Telephone',
    'Satellite Phone',
    'Antenna',
    'PA System',
    'Megaphone',
    'Other',
  ],
  TECHNICAL: [
    'GPS Device',
    'Measuring Instrument',
    'Laboratory Equipment',
    'Soil Tester',
    'Moisture Meter',
    'Microscope',
    'Calibration Tool',
    'Other',
  ],
  BOOKS: [
    'Reference Book',
    'Manual',
    'Journal / Publication',
    'Training Material',
    'Other',
  ],
  MOTOR_VEHICLES: [
    'Motorcycle',
    'Pickup Truck',
    'SUV',
    'Van',
    'Service Vehicle',
    'AUV',
    'Boat',
    'Other',
  ],
  DISASTER_RESPONSE: [
    'Life Vest',
    'Rescue Boat',
    'Tent',
    'Emergency Kit',
    'Generator',
    'Flashlight',
    'First Aid Kit',
    'Other',
  ],
  FURNITURE_FIXTURES: [
    'Office Desk',
    'Office Chair',
    'Filing Cabinet',
    'Shelf / Rack',
    'Conference Table',
    'Sofa / Couch',
    'Air Conditioner',
    'Electric Fan',
    'Other',
  ],
  OTHER_MACHINERY: [
    'Water Pump',
    'Welding Machine',
    'Compressor',
    'Concrete Mixer',
    'Power Tool',
    'Other',
  ],
}

export const SERVICEABLE_STATUSES = ['ASSIGNED', 'SPARE']
export const UNSERVICEABLE_STATUSES = ['OBSOLETE']

export const ASSET_TAG_PREFIX = 'PFIDA-'

export const EMPTY_FORM = {
  assetTag: '',
  newPropertyNumber: '',
  name: '',
  type: 'ICT_EQUIPMENT',
  subtype: '',
  status: 'SPARE',
  serialNumber: '',
  issuedTo: '',
  location: '',
  yearOfAcquisition: '',
  value: '',
  quantityPerPropertyCard: '',
  quantityPerPhysicalCount: '',
  notes: '',
}

export function formatPHP(amount) {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}
