// Deliberately fictional UI specimens. Never import into production or benchmarks.
export const examples = [
  {
    id: 'EX-1041', request: 'Where is my order?', method: 'Saved path', state: 'resolved', status: 'Resolved',
    ms: 2100, tools: 3, canonical: 'Retrieve order delivery status and expected arrival.',
    outcome: 'Tracking found. The example delivery is due on 29 September.',
    source: 'Source: fictional order EX-481 and a fictional carrier scan.',
    steps: ['Check the request against the saved delivery procedure.', 'Read the order and the latest carrier scan.', 'Answer with the shipment status and expected arrival.']
  },
  {
    id: 'EX-1042', request: 'Can I return an opened item?', method: 'Explored', state: 'resolved', status: 'Resolved',
    ms: 18400, tools: 8, canonical: 'Assess return eligibility for an opened product.',
    outcome: 'The example policy permits a return within 30 days. The customer requested eligibility, so no return was created.',
    source: 'Source: fictional return policy and a fictional purchase date.',
    steps: ['Read the return policy for the product category.', 'Compare the purchase date and reported product condition.', 'Explain eligibility without creating an unrequested return.']
  },
  {
    id: 'EX-1043', request: "My refund hasn't arrived.", method: 'Saved path', state: 'resolved', status: 'Resolved',
    ms: 6800, tools: 4, canonical: 'Retrieve refund status and expected settlement time.',
    outcome: 'The example refund was issued on 25 September. The payment record shows settlement is pending.',
    source: 'Source: fictional refund receipt EX-R82 and a fictional payment record.',
    steps: ['Read the refund-status procedure.', 'Find the existing refund and payment status.', 'Report pending settlement; do not issue a duplicate refund.']
  },
  {
    id: 'EX-1044', request: 'Change my delivery address.', method: 'Explored', state: 'review', status: 'Needs review',
    ms: 12700, tools: 6, canonical: 'Request a shipping-address change for an order already dispatched.',
    outcome: 'The example parcel has shipped. A support operator must ask the carrier whether redirection is possible.',
    source: 'Source: fictional dispatch record. Carrier permission is unavailable.',
    steps: ['Read the address-change policy.', 'Confirm dispatch; leave the original address unchanged.', 'Assign a carrier-redirection decision to a support operator.']
  }
];
