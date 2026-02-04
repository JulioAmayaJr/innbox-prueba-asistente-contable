import type { APIRoute } from "astro";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";

const RESEND_API_KEY = "re_DbmXJPxF_6CqjDHHKRMpkgzc71gujzBU9";
const MAIL_TO = "chatunivowhats@gmail.com";
const MAIL_FROM = "Prueba Objetiva <onboarding@resend.dev>";

function normalizeSelectedCases(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function val(data: any, k: string) {
  const x = data?.[k];
  if (x === null || x === undefined) return "";
  return String(x);
}

function wrapText(text: string, maxChars: number) {
  const words = (text || "").replace(/\r/g, "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function base64FromUint8(arr: Uint8Array) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    s += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return btoa(s);
}

async function buildExamPdf(data: any) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageW = 595.28;
  const pageH = 841.89;
  const lineH = 14;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  const drawText = (t: string, size = 11, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(t, { x: margin, y, size, font: bold ? fontBold : font, color });
    y -= size + 6;
  };

  const drawSection = (title: string) => {
    ensureSpace(40);
    page.drawRectangle({
      x: margin,
      y: y - 22,
      width: pageW - margin * 2,
      height: 26,
      color: rgb(0.92, 0.92, 0.97),
      borderColor: rgb(0.75, 0.75, 0.9),
      borderWidth: 1
    });
    page.drawText(title, { x: margin + 10, y: y - 16, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.45) });
    y -= 34;
  };

  const drawQA = (qTitle: string, qBody: string, answer: string) => {
    const maxChars = 95;
    const qLines = wrapText(qBody, maxChars);
    const aLines = wrapText(answer || "(Sin respuesta)", maxChars);

    const qBlockH = 18 + qLines.length * lineH;
    const aBlockH = 22 + aLines.length * lineH;
    const total = 18 + qBlockH + 10 + aBlockH + 10;

    ensureSpace(total);

    page.drawText(qTitle, { x: margin, y, size: 12, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;

    page.drawRectangle({
      x: margin,
      y: y - (qLines.length * lineH + 10),
      width: pageW - margin * 2,
      height: qLines.length * lineH + 14,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1
    });

    let qy = y - 14;
    for (const ln of qLines) {
      page.drawText(ln, { x: margin + 10, y: qy, size: 10, font, color: rgb(0.25, 0.25, 0.25) });
      qy -= lineH;
    }
    y = y - (qLines.length * lineH + 24);

    page.drawText("Respuesta:", { x: margin, y, size: 11, font: fontBold, color: rgb(0.1, 0.35, 0.2) });
    y -= 16;

    page.drawRectangle({
      x: margin,
      y: y - (aLines.length * lineH + 14),
      width: pageW - margin * 2,
      height: aLines.length * lineH + 18,
      color: rgb(0.93, 0.98, 0.94),
      borderColor: rgb(0.55, 0.8, 0.6),
      borderWidth: 1
    });

    let ay = y - 14;
    for (const ln of aLines) {
      page.drawText(ln, { x: margin + 10, y: ay, size: 10.5, font, color: rgb(0.12, 0.12, 0.12) });
      ay -= lineH;
    }

    y = y - (aLines.length * lineH + 28);
  };

  const now = new Date().toISOString();
  const casos = normalizeSelectedCases(data.caso_seleccionado);

  drawText("PRUEBA OBJETIVA — RESPUESTAS", 16, true);
  drawText(`Enviado: ${now}`, 10, false, rgb(0.35, 0.35, 0.35));
  drawText(`Nombre: ${val(data, "nombre")}`, 11, true);
  drawText(`Email: ${val(data, "email")}`, 10);
  drawText(`Teléfono: ${val(data, "telefono")}`, 10);
  drawText(`Inicio: ${val(data, "fecha_inicio")}`, 10);
  y -= 10;

  drawSection("SECCIÓN 1 — Casos Prácticos");

  const caseBlock = (id: string, title: string, qs: { t: string; body: string; k: string }[]) => {
    if (!casos.includes(id)) return;
    drawText(title, 12, true, rgb(0.2, 0.2, 0.45));
    y -= 6;
    for (const q of qs) drawQA(q.t, q.body, val(data, q.k));
    y -= 8;
  };

  caseBlock("caso1", "CASO 1: Programa de Aceleración – Sector Agrícola", [
    { t: "1.1 Documentación y Control Inicial (33%)", body: "¿Qué documentos administrativos y contables mínimos organizaría desde el inicio del proyecto? Liste al menos 6 documentos clave y explique brevemente para qué sirve cada uno.", k: "caso1_p1" },
    { t: "1.2 Organización Digital (33%)", body: "Proponga una estructura de carpetas en la nube para este programa. Incluya: jerarquía de carpetas, nomenclatura de archivos y permisos de acceso.", k: "caso1_p2" },
    { t: "1.3 Control Presupuestario (34%)", body: "Explique cómo llevaría el control de egresos por startup para no exceder los montos asignados. Describa: herramientas, frecuencia de actualización, indicadores de alerta y cómo reportaría el status.", k: "caso1_p3" }
  ]);

  caseBlock("caso2", "CASO 2: Programa de Capital Semilla – 25 MIPYMES", [
    { t: "2.1 Herramienta de Control (30%)", body: "¿Qué herramienta(s) utilizaría para el control administrativo y financiero? Justifique considerando: volumen, reportes, colaboración y costos.", k: "caso2_p1" },
    { t: "2.2 Diseño de Sistema de Control (40%)", body: "Diseñe una tabla de control maestro. Especifique: campos/columnas (mínimo 10), tipo de información y cómo usaría esta tabla para tomar decisiones.", k: "caso2_p2" },
    { t: "2.3 Gestión de Incumplimientos (30%)", body: "Mes 3, 8 mipymes (32%) no han entregado comprobantes vencidos hace 15 días. ¿Cómo actuaría? Acciones inmediatas, seguimiento, escalación y medidas preventivas.", k: "caso2_p3" }
  ]);

  caseBlock("caso3", "CASO 3: Digitalización con ERP – 200 MIPYMES", [
    { t: "3.1 Identificación de Riesgos (30%)", body: "Mencione al menos 5 riesgos administrativos o contables. Para cada uno: descripción, impacto y medida preventiva.", k: "caso3_p1" },
    { t: "3.2 Información Crítica en el ERP (35%)", body: "¿Qué información debe registrarse obligatoriamente por cada mipyme? Liste al menos 8 tipos de información y justifique por qué cada una es crítica.", k: "caso3_p2" },
    { t: "3.3 Gestión del Tiempo y Prioridades (35%)", body: "Con 200 mipymes: a) ¿Cómo organizaría su tiempo? b) ¿Estrategia para no atrasarse? c) ¿Qué delegaría/automatizaría? d) ¿Cómo mediría su avance?", k: "caso3_p3" }
  ]);

  drawSection("SECCIÓN 2 — Conocimientos Técnicos");
  for (let i = 1; i <= 10; i++) {
    const chosen = val(data, `p${i}`);
    const just = val(data, `p${i}_just`);
    drawQA(`Pregunta ${i}`, `Opción elegida: ${chosen || "(Sin selección)"}`, just);
  }

  drawSection("SECCIÓN 3 — Caso Ético");
  drawQA("3.1 Acción Inmediata (15%)", "¿Qué acción tomaría de inmediato al detectar esta situación? Pasos concretos en las próximas 2 horas.", val(data, "etica_p1"));
  drawQA("3.2 Comunicación Profesional (20%)", "¿Cómo comunicaría este hallazgo al coordinador? Redacte textualmente (correo/mensaje).", val(data, "etica_p2"));
  drawQA("3.3 Análisis de Riesgos (25%)", "¿Qué riesgos administrativos, contables, legales y éticos identifica? Liste al menos 5.", val(data, "etica_p3"));
  drawQA("3.4 Propuesta de Solución (25%)", "¿Qué alternativa concreta propondría para no detener el proyecto ni el informe, manteniendo orden y cumplimiento?", val(data, "etica_p4"));
  drawQA("3.5 Mejora de Procesos (15%)", "¿Qué mejora de proceso sugeriría para prevenirlo estructuralmente? Controles/sistemas/políticas.", val(data, "etica_p5"));

  drawSection("Autoevaluación (No puntuada)");
  drawQA("Auto 1", "¿Qué sección le resultó más desafiante y por qué?", val(data, "auto_p1"));
  drawQA("Auto 2", "¿Qué herramientas o conocimientos necesitaría desarrollar para este puesto?", val(data, "auto_p2"));
  drawQA("Auto 3", "¿Qué valor diferencial aportaría en los primeros 90 días?", val(data, "auto_p3"));

  const bytes = await pdf.save();
  return new Uint8Array(bytes);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const checked = normalizeSelectedCases(data.caso_seleccionado);
    if (checked.length !== 2) {
      return new Response(JSON.stringify({ message: "Debe seleccionar exactamente 2 casos." }), { status: 400 });
    }

    const pdfBytes = await buildExamPdf(data);
    const filename = `prueba-objetiva-${(val(data, "nombre") || "candidato").replace(/\s+/g, "_")}.pdf`;

    const subject = `Prueba Objetiva — ${val(data, "nombre") || "Candidato"} — ${val(data, "email") || ""}`;

    const resend = new Resend(RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to: [MAIL_TO],
      cc: data.email ? [String(data.email)] : undefined,
      subject,
      text:
        `Se adjunta PDF con respuestas.\n\n` +
        `Nombre: ${val(data, "nombre")}\n` +
        `Email: ${val(data, "email")}\n` +
        `Teléfono: ${val(data, "telefono")}\n` +
        `Inicio: ${val(data, "fecha_inicio")}\n`,
      attachments: [
        {
          filename,
          content: base64FromUint8(pdfBytes)
        }
      ]
    });

    if (error) {
      return new Response(JSON.stringify({ message: `Resend error: ${error.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err?.message || "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
