module.exports = {
  // Removes extra period at the end of dns
  formatDns: dns => (dns && dns.endsWith('.') ? dns.slice(0, dns.length - 1) : dns),
  appendValueToMap: (map, key, value) => {
    if (key) {
      map[key] = (map[key] || []).concat(value);
    }
  },
};
