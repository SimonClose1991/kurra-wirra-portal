import { useEffect, useRef } from "react";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useGetMe } from "@workspace/api-client-react";

import Landing from "@/pages/Landing";
import SignInPage from "@/pages/auth/SignIn";
import SignUpPage from "@/pages/auth/SignUp";
import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "@/pages/Dashboard";
import Section from "@/pages/Section";
import Category from "@/pages/Category";
import Document from "@/pages/Document";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUser from "@/pages/admin/AdminUser";
import AdminContent from "@/pages/admin/AdminContent";
import AdminDocumentForm from "@/pages/admin/AdminDocumentForm";
import AdminFormBuilder from "@/pages/admin/AdminFormBuilder";
import AdminFormSubmissions from "@/pages/admin/AdminFormSubmissions";
import FillForm from "@/pages/FillForm";
import StaffDocuments from "@/pages/StaffDocuments";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/kw-logo.jpg`,
  },
  variables: {
    colorPrimary: "hsl(150 40% 30%)",
    colorForeground: "hsl(150 15% 15%)",
    colorMutedForeground: "hsl(150 15% 45%)",
    colorDanger: "hsl(0 70% 50%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(150 10% 85%)",
    colorInputForeground: "hsl(150 15% 15%)",
    colorNeutral: "hsl(150 10% 85%)",
    colorModalBackdrop: "rgba(0, 0, 0, 0.4)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-white dark:bg-zinc-950 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-zinc-200 dark:border-zinc-800",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-zinc-900 dark:text-zinc-50 font-bold",
    headerSubtitle: "text-zinc-500 dark:text-zinc-400",
    socialButtonsBlockButtonText: "text-zinc-700 dark:text-zinc-300 font-medium",
    formFieldLabel: "text-zinc-700 dark:text-zinc-300 font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-zinc-500 dark:text-zinc-400",
    dividerText: "text-zinc-500 dark:text-zinc-400",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-emerald-600 dark:text-emerald-400",
    alertText: "text-zinc-900 dark:text-zinc-50",
    logoBox: "flex justify-center",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors",
    formFieldInput: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    footerAction: "flex gap-2 items-center justify-center",
    dividerLine: "bg-zinc-200 dark:bg-zinc-800",
    alert: "bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-200",
    otpCodeFieldInput: "border border-input focus:border-ring focus:ring-ring",
    formFieldRow: "space-y-4",
    main: "flex flex-col gap-4",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, requireAdmin = false, ...rest }: any) {
  const { data: me, isLoading } = useGetMe();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (requireAdmin && me?.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your induction portal",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started with your induction",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Show when="signed-in">
              <Switch>
                <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
                <Route path="/section/:sectionId" component={() => <ProtectedRoute component={Section} />} />
                <Route path="/category/:categoryId" component={() => <ProtectedRoute component={Category} />} />
                <Route path="/document/:documentId" component={() => <ProtectedRoute component={Document} />} />
                
                {/* Admin Routes */}
                <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} requireAdmin />} />
                <Route path="/admin/users/:clerkUserId" component={() => <ProtectedRoute component={AdminUser} requireAdmin />} />
                <Route path="/admin/content" component={() => <ProtectedRoute component={AdminContent} requireAdmin />} />
                <Route path="/admin/document/new" component={() => <ProtectedRoute component={AdminDocumentForm} requireAdmin />} />
                <Route path="/admin/document/:documentId/edit" component={() => <ProtectedRoute component={AdminDocumentForm} requireAdmin />} />
                <Route path="/admin/form/new" component={() => <ProtectedRoute component={AdminFormBuilder} requireAdmin />} />
                <Route path="/admin/form/:formId/edit" component={() => <ProtectedRoute component={AdminFormBuilder} requireAdmin />} />
                <Route path="/admin/form/:formId/submissions" component={() => <ProtectedRoute component={AdminFormSubmissions} requireAdmin />} />
                <Route path="/form/:formId" component={() => <ProtectedRoute component={FillForm} />} />
                <Route path="/my-documents" component={() => <ProtectedRoute component={StaffDocuments} />} />
                
                <Route component={NotFound} />
              </Switch>
            </Show>
            
            <Show when="signed-out">
              <Route component={HomeRedirect} />
            </Show>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
