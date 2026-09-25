/**
 * Godkender en URL foer den vises som et klikbart link.
 *
 * Linkene her kommer fra kilder ingen af dem boer stoles paa uden tjek: en
 * sagsbehandler der selv indtaster en URL (LinkPanel), og robotten der
 * kopierer OS2Forms- og bilag-URL'er fra en offentlig formularindsendelse
 * (Metadata). Et `javascript:`-link, der rammer et <a href>, koerer med
 * klikkerens fulde SharePoint-session naar det klikkes - det er stored XSS,
 * ikke en visningsdetalje. Kun http og https er sikre at rendere som link.
 *
 * `new URL()` normaliserer foerst - bl.a. fjerner ledende/afsluttende
 * whitespace, ligesom browsere goer foer navigation. Et naivt
 * `startsWith('http')`-tjek ville derfor lukke `"  javascript:alert(1)"`
 * igennem, fordi tjekket selv ikke trimmer. `new URL()` goer, og
 * `.protocol` bagefter afsloerer det rigtige skema.
 *
 * @param raa Den ukontrollerede vaerdi, typisk `felt.Url?.Url`.
 * @returns `raa` uaendret hvis skemaet er http/https, ellers `undefined`.
 */
export function sikkerUrl(raa: string | undefined): string | undefined {
  if (!raa) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(raa);
  } catch {
    // Ugyldig URL, herunder relative stier uden skema.
    return undefined;
  }

  return url.protocol === 'http:' || url.protocol === 'https:' ? raa : undefined;
}
