import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export const SettingsDialog = () => {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (!apiKey || !secretKey) {
      toast.error("Por favor, preencha ambas as chaves");
      return;
    }
    
    // Salvar no localStorage para uso futuro
    localStorage.setItem("binance_api_key", apiKey);
    localStorage.setItem("binance_secret_key", secretKey);
    
    toast.success("Chaves de API salvas com sucesso!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações da API</DialogTitle>
          <DialogDescription>
            Configure suas chaves da Binance API para acesso personalizado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua Binance API Key"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <Input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Sua Binance Secret Key"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Suas chaves são armazenadas localmente e usadas apenas para requisições à API da Binance.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
