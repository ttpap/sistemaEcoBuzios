export type AreaBase = "" | "/professor" | "/coordenador";

export function getAreaBaseFromPathname(pathname: string): AreaBase {
  if (pathname.startsWith("/professor")) return "/professor";
  if (pathname.startsWith("/coordenador")) return "/coordenador";
  return "";
}
