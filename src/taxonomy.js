// Transparent V0.1 keyword rules. These are hypotheses, NOT FDA codes or verified root causes.
export const TAXONOMY_VERSION = '0.1.0';
export const PATHWAYS = [
  {
    id: 'barrier', name: 'Sterile barrier & seals', family: 'Packaging',
    keywords: ['sterile barrier', 'seal breach', 'seal failure', 'seal integrity', 'pouch leak', 'seal was open', 'seal opened', 'unsealed', 'seal delamination', 'package not sterile', 'loss of sterility', 'sterility compromised', 'pin hole', 'pinhole'],
    question: 'Does the narrative suggest an actual sterile-barrier integrity problem, or only an unverified concern?',
    investigation: 'Verify package configuration, material/seal history and failure location; consider ISO 11607 and applicable validated seal/integrity methods.'
  },
  {
    id: 'damage', name: 'Physical package damage', family: 'Packaging',
    keywords: ['packaging torn', 'package torn', 'torn pouch', 'punctured pouch', 'puncture in pouch', 'crushed carton', 'damaged packaging', 'damaged package', 'broken tray', 'cracked tray', 'bent tray', 'package puncture', 'packaging puncture', 'lidding damage'],
    question: 'Where was damage observed, and could handling, design clearances, or distribution loads have contributed?',
    investigation: 'Review packout and protective features; consider distribution simulation, damage inspection and damage-to-integrity verification.'
  },
  {
    id: 'presentation', name: 'Aseptic presentation & opening', family: 'Packaging',
    keywords: ['difficulty opening', 'difficult to open', 'opening the pouch', 'opening the package', 'opening the tray', 'could not open', 'unable to open pouch', 'peel tab', 'peel force', 'aseptic presentation', 'device stuck in tray', 'device caught in packaging', 'device entangled', 'dropped during opening'],
    question: 'Could opening forces, device retention, or user technique contribute to a presentation challenge?',
    investigation: 'Review opening sequence and human-factors evidence; consider simulated-use observations and package-opening performance.'
  },
  {
    id: 'label', name: 'Labeling & traceability', family: 'Information',
    keywords: ['incorrect label', 'mislabeled', 'mislabelled', 'wrong expiration date', 'wrong expiry date', 'missing label', 'unreadable label', 'illegible label', 'barcode unreadable', 'barcode did not scan', 'incorrect udi', 'wrong lot number', 'label detached', 'label fell off', 'label mix-up', 'label mismatch'],
    question: 'Is the signal associated with label content, print readability, identification, or an application-process error?',
    investigation: 'Review label controls, reconciliation, print verification, UDI/lot traceability and environmental durability evidence.'
  },
  {
    id: 'aging', name: 'Storage & shelf-life', family: 'Distribution',
    keywords: ['expired device', 'beyond expiration', 'shelf life', 'shelf-life', 'aging failure', 'aged packaging', 'storage temperature', 'temperature excursion', 'humidity excursion', 'moisture ingress', 'condensation inside package', 'storage condition'],
    question: 'Does the report establish a storage exposure or aged-condition mechanism rather than merely mentioning an expiration date?',
    investigation: 'Establish exposure evidence and chronology; review real-time/accelerated-aging assumptions and material/pack integrity as applicable.'
  },
  {
    id: 'transport', name: 'Distribution & handling', family: 'Distribution',
    keywords: ['shipping damage', 'shipping carton', 'transit damage', 'transport damage', 'freight damage', 'damaged in shipment', 'shipping container', 'distribution testing', 'shock during transport', 'vibration damage', 'crushed during shipment'],
    question: 'Is there evidence for a distribution hazard, and is the damage attributable to transport?',
    investigation: 'Review shipping configuration, handling history and appropriate ASTM D4169 / ISTA distribution exposure models.'
  }
];
export const LENSES = [
  {id:'all', label:'All engineering pathways', pathways:PATHWAYS.map(p=>p.id)},
  {id:'packaging', label:'Packaging & presentation', pathways:['barrier','damage','presentation']},
  {id:'traceability', label:'Labeling & traceability', pathways:['label']},
  {id:'storage', label:'Storage & distribution', pathways:['aging','transport']}
];
