export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Falta el ID del archivo" });
  }

  try {
    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    const response = await fetch(driveUrl);

    if (!response.ok) {
      throw new Error(`Google Drive respondió con estado ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(buffer);
  } catch (error) {
    console.error("Error en proxy:", error);
    res.status(500).json({ error: error.message });
  }
}
