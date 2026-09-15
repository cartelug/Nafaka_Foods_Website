'use strict';
// Pure message builder. No storage, network request or automatic message sending.
const NafakaEnquiry = (() => {
  const products = Object.freeze(['Rice — general', 'Super rice', 'Local rice', 'Pakistan rice', 'Basmati rice', 'Maize', 'Beans', 'Soya bean', 'Other commodities', 'Smart vending']);
  const clean = value => String(value || '').trim();
  function build(fields) {
    const product = products.includes(fields.product) ? fields.product : products[0];
    const name = clean(fields.name);
    const location = clean(fields.location);
    if (!name || !location) throw new Error('Name and location are required.');
    if (product === 'Smart vending' && !clean(fields.details)) throw new Error('Please describe the building.');
    const message = [
      'Hello Nafaka Foods,',
      `I would like to enquire about ${product}.`,
      `Name: ${name}`,
      clean(fields.business) ? `Business / institution: ${clean(fields.business)}` : '',
      product !== 'Smart vending' && clean(fields.quantity) ? `Quantity: ${clean(fields.quantity)}` : '',
      `Location: ${location}`,
      clean(fields.details) ? `Details: ${clean(fields.details)}` : '',
      'Please share availability and the next steps. Thank you.'
    ].filter(Boolean).join('\n');
    return {message, url: 'https://wa.me/256776974521?text=' + encodeURIComponent(message)};
  }
  return Object.freeze({ products, build });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NafakaEnquiry;
