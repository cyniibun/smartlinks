declare module "react-simple-maps" {
  import type { ComponentType, SVGProps } from "react";

  export const ComposableMap: ComponentType<SVGProps<SVGSVGElement> & {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
  }>;

  export const Geographies: ComponentType<{
    geography: string | Record<string, unknown>;
    children: (props: { geographies: Array<Record<string, any>> }) => React.ReactNode;
  }>;

  export const Geography: ComponentType<SVGProps<SVGPathElement> & {
    geography: Record<string, any>;
  }>;
}
