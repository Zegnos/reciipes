import { jsPDF } from "jspdf";

class PDFService {
  static async generateRecipePDF(recipe) {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const footerReserve = 16;

    const colors = {
      text: [24, 27, 31],
      accent: [160, 165, 170],
      soft: [210, 214, 219],
    };

    const setFont = (size, style = "normal") => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
    };

    const formatTime = (minutes) => {
      if (!minutes || minutes <= 0) return "—";
      if (minutes < 60) return `${minutes} min`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins} min` : `${hours}h`;
    };

    const sanitize = (value, fallback = "—") => (value ? value : fallback);

    const getLines = (texts, width, fontSize) => {
      const previousSize = doc.getFontSize();
      doc.setFontSize(fontSize);
      const lines = [];
      texts.forEach((text) => {
        const parts = doc.splitTextToSize(String(text || ""), width);
        lines.push(...parts);
      });
      doc.setFontSize(previousSize);
      return lines;
    };

    const fitContent = (texts, width, availableHeight, startSize = 10) => {
      let fontSize = startSize;
      let lines = getLines(texts, width, fontSize);
      const lineHeightFactor = 0.58;

      const estimateHeight = (lineCount, size) =>
        lineCount * size * lineHeightFactor;

      while (
        fontSize > 7 &&
        estimateHeight(lines.length, fontSize) + 4 > availableHeight
      ) {
        fontSize -= 0.5;
        lines = getLines(texts, width, fontSize);
      }

      const needed = estimateHeight(lines.length, fontSize) + 4;
      if (needed > availableHeight) {
        const maxLines = Math.max(
          1,
          Math.floor((availableHeight - 4) / (fontSize * lineHeightFactor))
        );
        if (maxLines < lines.length) {
          const trimmed = lines.slice(0, maxLines);
          trimmed[trimmed.length - 1] = `${trimmed[trimmed.length - 1]} …`;
          lines = trimmed;
        }
      }

      return { fontSize, lines };
    };

    let yPos = margin;
    doc.setTextColor(...colors.text);

    const drawTitleArea = () => {
      setFont(26, "bold");
      doc.text(sanitize(recipe.name, "Recette sans nom"), margin, yPos);
      yPos += 10;

      const description =
        recipe.description ||
        "Export rapide depuis Reciipes — carnet de recettes personnel.";
      setFont(12);
      const lines = doc.splitTextToSize(description, contentWidth);
      const lineHeight = 12 * 0.58;
      lines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
      yPos += 4;
    };

    const drawInfoGrid = () => {
      const infoPairs = [
        ["Préparation", formatTime(recipe.prepTime)],
        ["Cuisson", formatTime(recipe.cookingTime)],
        ["Total", formatTime(recipe.totalTime)],
        [
          "Portions",
          recipe.servings
            ? `${recipe.servings} ${recipe.baseUnit || "parts"}`
            : "—",
        ],
        ["Catégorie", sanitize(recipe.category)],
        ["Type", sanitize(recipe.type)],
      ];

      const columns = 3;
      const rows = Math.ceil(infoPairs.length / columns);
      const cellWidth = contentWidth / columns;
      const rowHeight = 18;
      const gridTop = yPos;

      doc.setDrawColor(...colors.soft);
      doc.setLineWidth(0.25);

      for (let r = 0; r <= rows; r += 1) {
        const lineY = gridTop + r * rowHeight;
        doc.line(margin, lineY, pageWidth - margin, lineY);
      }

      for (let c = 1; c < columns; c += 1) {
        const lineX = margin + c * cellWidth;
        doc.line(lineX, gridTop, lineX, gridTop + rows * rowHeight);
      }

      infoPairs.forEach(([label, value], index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = margin + col * cellWidth + 3;
        const y = gridTop + row * rowHeight + 6;

        setFont(8.5, "bold");
        doc.text(label.toUpperCase(), x, y);

        const valueLines = doc.splitTextToSize(String(value), cellWidth - 6);
        setFont(11);
        valueLines.slice(0, 2).forEach((line, idx) => {
          doc.text(line, x, y + 5 + idx * 5);
        });
      });

      yPos = gridTop + rows * rowHeight + 8;
    };

    const drawColumnBlocks = (blocks, startX, startY, width, maxHeight) => {
      let cursor = startY;
      const bottom = startY + maxHeight;
      blocks.forEach((block) => {
        if (!block.content || block.content.length === 0) {
          return;
        }

        const available = bottom - cursor;
        if (available <= 6) {
          return;
        }

        const { fontSize, lines } = fitContent(
          block.content,
          width,
          available,
          block.baseSize || 9
        );

        if (!lines.length) {
          return;
        }

        setFont(10, "bold");
        doc.text(block.title.toUpperCase(), startX, cursor);
        cursor += 4.5;

        setFont(fontSize);
        const lineHeight = fontSize * 0.6;
        lines.forEach((line) => {
          doc.text(line, startX, cursor, { maxWidth: width });
          cursor += lineHeight;
        });

        cursor += 3.5;
      });
    };

    const drawFooter = () => {
      const footerY = pageHeight - margin / 2;
      doc.setDrawColor(...colors.soft);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

      setFont(8);
      doc.setTextColor(...colors.accent);
      const dateStr = new Date().toLocaleDateString("fr-FR");
      doc.text(`Reciipes · ${dateStr}`, margin, footerY - 1);
      const linkText = "reciipes.fr";
      const textWidth = doc.getTextWidth(linkText);
      doc.text(linkText, pageWidth - margin - textWidth, footerY - 1);
      doc.setTextColor(...colors.text);
    };

    drawTitleArea();
    drawInfoGrid();

    const columnStartY = yPos + 4;
    const columnGap = 10;
    const columnWidth = (contentWidth - columnGap) / 2;
    const columnHeight = pageHeight - footerReserve - columnStartY;

    const ingredientLines =
      recipe.ingredients && recipe.ingredients.length
        ? recipe.ingredients.map((ingredient) => {
            const quantity = [ingredient.quantity, ingredient.unit]
              .filter(Boolean)
              .join(" ");
            const label = ingredient.name || "Ingrédient";
            const text = quantity ? `${quantity} · ${label}` : label;
            return `• ${text}`;
          })
        : ["Aucun ingrédient spécifié."];

    const instructionLines =
      recipe.instructions && recipe.instructions.length
        ? recipe.instructions.map(
            (instruction, index) => `${index + 1}. ${instruction}`
          )
        : ["Aucune instruction spécifiée."];

    const notesLines = recipe.notes
      ? [recipe.notes]
      : ["Pas de note supplémentaire."];

    const tagsLines =
      recipe.tags && recipe.tags.length
        ? [recipe.tags.map((tag) => `#${tag}`).join("  ")]
        : [];

    const leftBlocks = [
      { title: "Ingrédients", content: ingredientLines },
      { title: "Notes", content: notesLines, baseSize: 8.5 },
      { title: "Tags", content: tagsLines, baseSize: 8 },
    ];

    const rightBlocks = [
      { title: "Préparation", content: instructionLines, baseSize: 10 },
    ];

    drawColumnBlocks(
      leftBlocks,
      margin,
      columnStartY,
      columnWidth,
      columnHeight
    );
    drawColumnBlocks(
      rightBlocks,
      margin + columnWidth + columnGap,
      columnStartY,
      columnWidth,
      columnHeight
    );

    drawFooter();

    const pdfOutput = doc.output("arraybuffer");
    return Buffer.from(pdfOutput);
  }
}

export default PDFService;
