import * as React from 'react';

/**
 * Faelles monteringspunkt for Fluent UI's portal-baserede komponenter.
 *
 * Dropdown, Combobox, Dialog, Menu, Tooltip og Popover renderer som standard
 * via en portal til document.body - altsaa UDEN FOR den DOM-node hvor
 * FluentProvider har defineret temaets CSS-variabler. Resultatet er en ustylet
 * popup med gennemsigtig baggrund.
 *
 * Det ligner et cache-problem og er det ikke. Opgaveportalens TROUBLESHOOTING.md
 * beskriver det, og loesningen er at give hver saadan komponent en mountNode
 * inde i providerens eget traee. Her ligger den ét sted, saa ingen kan glemme det.
 */
const MountNodeContext = React.createContext<HTMLDivElement | undefined>(undefined);

export function useMountNode(): HTMLDivElement | undefined {
  return React.useContext(MountNodeContext);
}

export const MountNodeProvider: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [node, setNode] = React.useState<HTMLDivElement | undefined>(undefined);

  return (
    <MountNodeContext.Provider value={node}>
      {children}
      <div ref={(el) => setNode(el ?? undefined)} style={{ position: 'fixed', zIndex: 1000000 }} />
    </MountNodeContext.Provider>
  );
};
