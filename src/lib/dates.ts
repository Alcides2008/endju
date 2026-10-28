/** Datas no fuso de Luanda (docs/02 · convenções), em português. */
const day = new Intl.DateTimeFormat("pt-AO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Luanda",
});
const dayTime = new Intl.DateTimeFormat("pt-AO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Luanda",
});
const weekday = new Intl.DateTimeFormat("pt-AO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Luanda",
});

export const formatDate = (value: Date | null | undefined) => (value ? day.format(value) : "—");
export const formatDateTime = (value: Date | null | undefined) => (value ? dayTime.format(value) : "—");
export const formatWeekday = (value: Date | null | undefined) => (value ? weekday.format(value) : "—");
