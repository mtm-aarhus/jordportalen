import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';

import Jordportalen from './components/Jordportalen';
import { IJordportalenProps } from './components/IJordportalenProps';

export interface IJordportalenWebPartProps {}

export default class JordportalenWebPart extends BaseClientSideWebPart<IJordportalenWebPartProps> {
  private _sp!: SPFI;

  protected async onInit(): Promise<void> {
    await super.onInit();
    this._sp = spfi().using(SPFx(this.context));
  }

  public render(): void {
    const element = React.createElement<IJordportalenProps>(Jordportalen, {
      sp: this._sp,
      sideUrl: this.context.pageContext.web.absoluteUrl + window.location.pathname,
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return { pages: [] };
  }
}
