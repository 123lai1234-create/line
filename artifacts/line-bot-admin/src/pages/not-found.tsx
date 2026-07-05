import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background/50 font-sans p-4">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md w-full">
        <Card className="border-border/60 shadow-lg border-t-4 border-t-primary rounded-lg overflow-hidden">
          <CardContent className="pt-8 pb-8 px-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-6">
              <AlertCircle className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight mb-3">找不到頁面 (404)</h1>
            
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              您嘗試存取的頁面不存在，或已被移動到其他位置。請確認網址是否正確。
            </p>

            <Link href="/">
              <Button className="w-full sm:w-auto px-8 shadow-sm">
                返回總覽
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
