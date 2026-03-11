export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-tl from-chart-1/5 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center">
              <span className="text-white font-bold text-lg">I</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              InvenPro
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Advanced Inventory Management System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
