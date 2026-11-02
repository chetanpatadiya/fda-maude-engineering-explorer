// ENTIRE FILE IS FICTIONAL. Synthetic narratives illustrate rule behavior; none represent an FDA report.
const demo=(n,eventType,narrative,device={})=>({
  __source:'demo',mdr_report_key:`SYNTH-${n}`,report_number:`SYNTHETIC-00${n}`,
  date_received:`20260${Math.min(n,9)}15`,event_type:eventType,
  device:[{brand_name:'Illustrative Device',generic_name:'Example medical device',manufacturer_d_name:'Example Company',device_report_product_code:'XXX',...device}],
  mdr_text:[{text_type_code:'Description of Event or Problem',text:narrative}]
});
export const DEMO_RECORDS=[
 demo(1,'Malfunction','During preparation for use, the clinician noticed a seal breach along the chevron of a sterile pouch. The device was not used.'),
 demo(2,'Injury','While removing the device, staff experienced difficulty opening the tray. The device caught in packaging and fell from the sterile field.'),
 demo(3,'Malfunction','The external carton arrived crushed. A punctured pouch was observed after the shipping carton was opened.'),
 demo(4,'Other','The barcode did not scan and the lot number on the carton did not match the inner label. The product was quarantined.'),
 demo(5,'Malfunction','The initial complaint indicated a possible package defect. Evaluation found no evidence of seal failure and the sterile barrier was intact.'),
 demo(6,'Other','A temperature excursion occurred during storage. Condensation inside package was reported by the receiving facility.'),
 demo(7,'Malfunction','The operator described a cracked polymer component and device occlusion; no information about packaging was supplied.'),
 demo(8,'Other','Following transit damage, the site found damaged packaging. No device defect was confirmed during subsequent visual inspection.')
];
