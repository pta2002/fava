/**
 * Helper functions to format numbers and dates.
 */

import { format } from "d3-format";
import { timeFormat, utcFormat } from "d3-time-format";
import { derived } from "svelte/store";

import { fava_options, incognito, interval, precisions } from "./stores";

/**
 * A number formatting function for a locale.
 * @param locale - The locale to use.
 * @param precision - The number of decimal digits to show.
 */
export function localeFormatter(
  locale: string | null,
  precision = 2
): (num: number) => string {
  if (!locale) {
    return format(`.${precision}f`);
  }
  const opts = {
    // this needs to be between 0 and 20
    minimumFractionDigits: Math.max(0, Math.min(precision, 20)),
  };
  const fmt = new Intl.NumberFormat(locale.replace("_", "-"), opts);
  return fmt.format.bind(fmt);
}

const replaceNumbers = (num: string) => num.replace(/[0-9]/g, "X");

const formatterPer = format(".2f");
export function formatPercentage(number: number): string {
  return `${formatterPer(Math.abs(number) * 100)}%`;
}

export interface FormatterContext {
  /** Render a number to a short string, for example for the y-axis of a line chart. */
  short: (number: number | { valueOf(): number }) => string;
  /** Render an amount to a string like "2.00 USD" */
  amount: (num: number, currency: string) => string;
}

const formatterShort = format(".3s");
export const ctx = derived(
  [incognito, fava_options, precisions],
  ([i, f, p]): FormatterContext => {
    const formatter = localeFormatter(f.locale);
    const currencyFormatters = Object.fromEntries(
      Object.entries(p).map(
        ([currency, prec]) =>
          [currency, localeFormatter(f.locale, prec)] as const
      )
    );
    const formatWithCurrency = (n: number, c: string) => {
      const currencyFormatter = currencyFormatters[c];
      return currencyFormatter ? currencyFormatter(n) : formatter(n);
    };
    return i
      ? {
          short: (n) => replaceNumbers(formatterShort(n)),
          amount: (n, c) => `${replaceNumbers(formatter(n))} ${c}`,
        }
      : {
          short: (n) => formatterShort(n),
          amount: (n, c) => `${formatWithCurrency(n, c)} ${c}`,
        };
  }
);

type DateFormatter = (date: Date) => string;
interface DateFormatters {
  year: DateFormatter;
  quarter: DateFormatter;
  month: DateFormatter;
  week: DateFormatter;
  day: DateFormatter;
}

/** Format the date as a ISO-8601 date string. */
export const day = utcFormat("%Y-%m-%d");

/** Date formatters for human consumption. */
export const dateFormat: DateFormatters = {
  year: utcFormat("%Y"),
  quarter: (date) =>
    `${date.getUTCFullYear()}Q${Math.floor(date.getUTCMonth() / 3) + 1}`,
  month: utcFormat("%b %Y"),
  week: utcFormat("%YW%W"),
  day,
};

/** Date formatters for the entry filter form. */
export const timeFilterDateFormat: DateFormatters = {
  year: utcFormat("%Y"),
  quarter: (date) =>
    `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`,
  month: utcFormat("%Y-%m"),
  week: utcFormat("%Y-W%W"),
  day,
};

/** Today as a ISO-8601 date string. */
export function todayAsString(): string {
  return timeFormat("%Y-%m-%d")(new Date());
}

export const currentDateFormat = derived(interval, (val) => dateFormat[val]);
export const currentTimeFilterDateFormat = derived(
  interval,
  (val) => timeFilterDateFormat[val]
);
