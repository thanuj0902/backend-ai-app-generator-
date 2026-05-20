export interface RouteDefinition {
  path: string;
  component: string;
  layout?: string;
  middleware?: string[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeRouteTree {
  routes: RouteDefinition[];
  layouts: Record<string, string>;
  middleware: Record<string, string[]>;
}

export class RuntimeRouter {
  private tree: RuntimeRouteTree;

  constructor(tree: RuntimeRouteTree) {
    this.tree = tree;
  }

  resolveRoute(path: string): RouteDefinition | undefined {
    return this.tree.routes.find((r) => {
      const pattern = r.path
        .replace(/\[.*?\]/g, "([^/]+)")
        .replace(/\//g, "\\/");
      return new RegExp(`^${pattern}$`).test(path);
    });
  }

  getLayout(path: string): string | undefined {
    return this.tree.layouts[path];
  }

  getMiddleware(path: string): string[] {
    const match = this.resolveRoute(path);
    if (!match || !match.middleware) return [];

    return match.middleware.flatMap(
      (m) => this.tree.middleware[m] || []
    );
  }

  getRouteTree(): RuntimeRouteTree {
    return this.tree;
  }
}
