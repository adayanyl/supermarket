// Parser do HTML da página de consulta da NFC-e.
// A maioria dos estados (incluindo GO) usa o mesmo "Portal NFC-e", cujos itens
// ficam numa tabela #tabResult. É um best-effort: campos faltando não quebram.
import * as cheerio from "cheerio";

import type { ParsedItem, SefazResult } from "./types";

type Api = ReturnType<typeof cheerio.load>;

/** Converte número no formato BR ("1.234,56") para Number. */
export function parseBrNumber(raw: string | undefined | null): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function extractCnpj($: Api): string | undefined {
  const m = $("body").text().match(/CNPJ:?\s*([\d./-]{14,20})/i);
  if (!m) return undefined;
  const digits = m[1].replace(/\D/g, "");
  return digits.length === 14 ? digits : undefined;
}

function extractTotal($: Api): number | undefined {
  const text = $("body").text();
  const m = text.match(/Valor (?:a pagar|total)\s*R?\$?\s*([\d.,]+)/i);
  if (m) return round2(parseBrNumber(m[1]));
  const v = parseBrNumber($(".totalNumb").last().text());
  return v || undefined;
}

function extractDate($: Api): Date | undefined {
  const m = $("body")
    .text()
    .match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  // meio-dia para evitar saltos de fuso ao normalizar para o mês
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12);
}

/** Lê o HTML da consulta e devolve loja, data, total e itens. */
export function parseNfceHtml(html: string): SefazResult {
  const $ = cheerio.load(html);
  const items: ParsedItem[] = [];

  $("#tabResult tr").each((_, tr) => {
    const row = $(tr);

    const description = row.find(".txtTit").first().text().replace(/\s+/g, " ").trim();
    if (!description) return;

    const stripLabel = (sel: string): string => {
      const node = row.find(sel).first();
      if (!node.length) return "";
      const c = node.clone();
      c.find("strong").remove();
      return c.text().replace(/\s+/g, " ").trim();
    };

    const quantity = parseBrNumber(stripLabel(".Rqtd")) || 1;
    const unit = (stripLabel(".RUN") || "UN").toUpperCase().slice(0, 10);
    const unitPrice = parseBrNumber(stripLabel(".RvlUnit"));
    let totalPrice = parseBrNumber(row.find(".valor").first().text());
    if (!totalPrice) totalPrice = round2(quantity * unitPrice);

    items.push({
      rawDescription: description,
      ean: null,
      quantity,
      unit,
      unitPrice: unitPrice || (quantity ? round2(totalPrice / quantity) : 0),
      totalPrice,
    });
  });

  const name = $(".txtTopo").first().text().replace(/\s+/g, " ").trim() || undefined;
  const cnpj = extractCnpj($);
  const store = name || cnpj ? { name, cnpj } : undefined;

  return {
    status: items.length > 0 ? "auto" : "manual",
    store,
    purchasedAt: extractDate($),
    totalValue: extractTotal($),
    items,
  };
}
