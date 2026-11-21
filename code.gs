/**
 * API DE CONEXIÓN (Code.gs) - Versión Final Definitiva y Blindada
 */

function buscarParte(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetIndice = ss.getSheetByName("IndiceParte");
  const sheetNotas = ss.getSheetByName("NotaReferencia");
  const sheetPrecios = ss.getSheetByName("PrecioReferencia");
  const sheetVersiones = ss.getSheetByName("VersionCatalogo");

  // Obtenemos los datos, protegiendo si alguna hoja no existe
  const dataIndice = sheetIndice ? sheetIndice.getDataRange().getValues() : [];
  const dataNotas = sheetNotas ? sheetNotas.getDataRange().getValues() : [];
  const dataPrecios = sheetPrecios ? sheetPrecios.getDataRange().getValues() : [];
  const dataVersiones = sheetVersiones ? sheetVersiones.getDataRange().getValues() : [];

  // Convertimos la búsqueda a minúsculas de forma segura
  const q = query ? query.toString().toLowerCase().trim() : "";
  let resultados = [];

  // Función auxiliar para limpiar los .0 de los números
  const limpiar = (val) => {
    if (val === null || val === undefined) return "";
    let str = val.toString();
    if (str.endsWith(".0")) str = str.slice(0, -2);
    return str.toLowerCase().trim();
  };

  // 1. Buscar en el Índice
  for (let i = 1; i < dataIndice.length; i++) {
    const row = dataIndice[i];
    const codigo = limpiar(row[2]);
    const texto = limpiar(row[6]);

    if (codigo.includes(q) || texto.includes(q)) {
      const versionId = limpiar(row[1]);
      let archivoUrl = "";
      
      for (let j = 1; j < dataVersiones.length; j++) {
        if (limpiar(dataVersiones[j][0]) === versionId) {
          archivoUrl = dataVersiones[j][3] ? dataVersiones[j][3].toString() : "";
          break;
        }
      }

      // 🔥 AQUI AGREGAMOS LAS COORDENADAS (row[5] es la columna F)
      resultados.push({
        id: row[0] ? row[0].toString() : "",
        codigo: row[2] ? row[2].toString().replace('.0', '') : "",
        descripcion: row[3] ? row[3].toString() : "",
        pagina: row[4] ? row[4].toString().replace('.0', '') : "1",
        url_pdf: archivoUrl,
        coordenadas: row[5] ? row[5].toString() : "" 
      });
    }
  }

  // Si no hay resultados, salir limpio
  if (resultados.length === 0) return { partes: [], notas: [], precios: [] };

  // 🔥 BLINDAJE: Forzamos a que sea un String sí o sí
  let codigoPrincipal = String(resultados[0].codigo || "").toLowerCase();
  
  let notasEncontradas = [];
  let preciosEncontrados = [];

  // 2. Buscar Notas (Relacionadas al código encontrado)
  for (let i = 1; i < dataNotas.length; i++) {
    const row = dataNotas[i];
    const rowCodigoA = row[1] ? String(row[1]).toLowerCase() : "";
    const rowCodigoB = row[2] ? String(row[2]).toLowerCase() : "";
    
    if ((rowCodigoA !== "" && rowCodigoA === codigoPrincipal) || 
        (rowCodigoB !== "" && rowCodigoB === codigoPrincipal)) {
      notasEncontradas.push({
        autor: row[4] ? String(row[4]) : "Anónimo", 
        fecha: row[5] ? String(row[5]) : "", 
        confianza: row[6] ? String(row[6]) : "MEDIA", 
        nota: row[8] ? String(row[8]) : ""
      });
    }
  }

  // 3. Buscar Precios (Vigentes para el código encontrado)
  for (let i = 1; i < dataPrecios.length; i++) {
    const row = dataPrecios[i];
    const rowCodigo = row[1] ? String(row[1]).toLowerCase() : "";
    
    if (rowCodigo !== "" && rowCodigo === codigoPrincipal && row[6] === true) {
      preciosEncontrados.push({
        precio: row[2] ? String(row[2]) : "0", 
        moneda: row[3] ? String(row[3]) : "MXN", 
        autor: row[4] ? String(row[4]) : "Sistema", 
        fecha: row[5] ? String(row[5]) : ""
      });
    }
  }

  return { partes: resultados, notas: notasEncontradas, precios: preciosEncontrados };
}

function guardarNota(codigoA, codigoB, tipo, autor, confianza, nota) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("NotaReferencia");
  const id = Utilities.getUuid();
  const fecha = new Date().toISOString();
  sheet.appendRow([id, codigoA, codigoB, tipo, autor, fecha, confianza, "ACTIVA", nota]);
  return { success: true, message: "Nota guardada correctamente" };
}

function guardarPrecio(codigo, precio, moneda, autor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PrecioReferencia");
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase() === codigo.toLowerCase() && data[i][6] === true) {
      sheet.getRange(i + 1, 7).setValue(false);
    }
  }

  const id = Utilities.getUuid();
  const fecha = new Date().toISOString();
  sheet.appendRow([id, codigo, precio, moneda, autor, fecha, true]);
  return { success: true, message: "Precio actualizado" };
}

// ---------------------------------------------------------
// DOGET (Para probar en el navegador)
// ---------------------------------------------------------
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: "API funcionando correctamente.",
    nota: "Usa POST para buscar partes."
  })).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------
// DOPOST (Para recibir datos de la interfaz)
// ---------------------------------------------------------
function doPost(e) {
  try {
    let params;
    if (e.parameter && e.parameter.action) {
      params = e.parameter;
    } else if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      throw new Error("No se recibieron datos válidos.");
    }
    
    let resultado = {};

    if (params.action === "buscar") {
      resultado = buscarParte(params.query);
    } else if (params.action === "guardarNota") {
      resultado = guardarNota(params.codigoA, params.codigoB, params.tipo, params.autor, params.confianza, params.nota);
    } else if (params.action === "guardarPrecio") {
      resultado = guardarPrecio(params.codigo, params.precio, params.moneda, params.autor);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: resultado }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}