/**
 * Wraps every <img> in an HTML string in a numbered <figure> with a
 * <figcaption>, so screenshots get figure numbers/captions in reports.
 *
 * @param html    Rich text HTML content
 * @param prefix  Section-based numbering prefix (e.g. "4.1" for finding 4.1)
 * @param start   First figure number within this section (default 1)
 * @returns html with images wrapped in figures, and the next free number
 */
export function captionFigures(
    html: string,
    prefix: string,
    start = 1
): { html: string; next: number } {
    if (!html || !html.includes('<img')) return { html, next: start };

    const doc = new DOMParser().parseFromString(html, 'text/html');
    let n = start;

    doc.body.querySelectorAll('img').forEach((img) => {
        const figure = doc.createElement('figure');
        const caption = doc.createElement('figcaption');
        const alt = (img.getAttribute('alt') || '').trim();
        caption.textContent = alt ? `Figure ${prefix}.${n}: ${alt}` : `Figure ${prefix}.${n}`;
        img.replaceWith(figure);
        figure.appendChild(img);
        figure.appendChild(caption);
        n++;
    });

    return { html: doc.body.innerHTML, next: n };
}
