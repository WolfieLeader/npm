const ipv4Regex = new RegExp("^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(.(?!$)|$)){4}$");
const ipv6Regex = new RegExp(
  "(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]).){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]).){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))"
);

const isIPv4 = (ip: string): boolean => ipv4Regex.test(ip);
const isIPv6 = (ip: string): boolean => ipv6Regex.test(ip);
const isIP = (ip: string): boolean => isIPv4(ip) || isIPv6(ip);

class IpMap {
  ipv4Map: Map<string, number>;
  ipv6Map: Map<string, number>;

  constructor() {
    this.ipv4Map = new Map<string, number>();
    this.ipv6Map = new Map<string, number>();
  }

  insertIP(ip: unknown): void {
    if (!ip) return;
    if (typeof ip !== "string") return;
    if (!isIP(ip)) return;
    if (isIPv4(ip)) {
      const count = this.ipv4Map.get(ip) || 0;
      this.ipv4Map.set(ip, count + 1);
    }
    if (isIPv6(ip)) {
      const count = this.ipv6Map.get(ip) || 0;
      this.ipv6Map.set(ip, count + 1);
    }
  }
}

export default IpMap;
