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
  const [feePerLeg, setFeePerLeg] = useState<string>(() => localStorage.getItem("settings_fee_per_leg") || "0.10");
  const [slipPerLeg, setSlipPerLeg] = useState<string>(() => localStorage.getItem("settings_slip_per_leg") || "0.05");
  const [outlierPct, setOutlierPct] = useState<string>(() => localStorage.getItem("settings_outlier_pct") || "8");
  const [profitMethod, setProfitMethod] = useState<string>(() => localStorage.getItem("settings_profit_method") || "max");
  const [oppThreshold, setOppThreshold] = useState<string>(() => localStorage.getItem("settings_threshold") || "0.5");
  // alvo estratégico de spread (meta de fechamento do basis)
  const [targetSpread, setTargetSpread] = useState<string>(() => localStorage.getItem("settings_target_spread") || "0.20");
  const [uiThrottleMs, setUiThrottleMs] = useState<string>(() => localStorage.getItem("settings_ui_throttle_ms") || "800");
  const [minHoldMs, setMinHoldMs] = useState<string>(() => localStorage.getItem("settings_min_hold_ms") || "3000");
  const [enableAlerts, setEnableAlerts] = useState<boolean>(() => localStorage.getItem("settings_enable_alerts") === "true");
  const [alertThreshold, setAlertThreshold] = useState<string>(() => localStorage.getItem("settings_alert_threshold") || "1.0");
  const [enableSound, setEnableSound] = useState<boolean>(() => localStorage.getItem("settings_enable_sound") === "true");
  const [withdrawalFee, setWithdrawalFee] = useState<string>(() => localStorage.getItem("settings_withdrawal_fee") || "0.15");
  const [depositFee, setDepositFee] = useState<string>(() => localStorage.getItem("settings_deposit_fee") || "0.0");
  const [interExchangeThreshold, setInterExchangeThreshold] = useState<string>(() => localStorage.getItem("settings_inter_exchange_threshold") || "0.5");

  const handleSave = () => {
    if (!apiKey || !secretKey) {
      toast.error("Por favor, preencha ambas as chaves");
      return;
    }
    
    // Salvar no localStorage para uso futuro
    localStorage.setItem("binance_api_key", apiKey);
    localStorage.setItem("binance_secret_key", secretKey);
    localStorage.setItem("settings_fee_per_leg", feePerLeg);
    localStorage.setItem("settings_slip_per_leg", slipPerLeg);
    localStorage.setItem("settings_outlier_pct", outlierPct);
    localStorage.setItem("settings_profit_method", profitMethod);
    localStorage.setItem("settings_threshold", oppThreshold);
    localStorage.setItem("settings_target_spread", targetSpread);
    localStorage.setItem("settings_ui_throttle_ms", uiThrottleMs);
    localStorage.setItem("settings_min_hold_ms", minHoldMs);
    localStorage.setItem("settings_enable_alerts", String(enableAlerts));
    localStorage.setItem("settings_alert_threshold", alertThreshold);
    localStorage.setItem("settings_enable_sound", String(enableSound));
    localStorage.setItem("settings_withdrawal_fee", withdrawalFee);
    localStorage.setItem("settings_deposit_fee", depositFee);
    localStorage.setItem("settings_inter_exchange_threshold", interExchangeThreshold);
    
    toast.success("Configurações salvas com sucesso!");
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
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Configure suas chaves e parâmetros de análise.
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
          <div className="grid gap-2 grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="feePerLeg">Fee por perna (%)</Label>
              <Input id="feePerLeg" type="number" step="0.01" value={feePerLeg} onChange={(e) => setFeePerLeg(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slipPerLeg">Slippage por perna (%)</Label>
              <Input id="slipPerLeg" type="number" step="0.01" value={slipPerLeg} onChange={(e) => setSlipPerLeg(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2 grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="outlierPct">Limite de outlier (%)</Label>
              <Input id="outlierPct" type="number" step="0.1" value={outlierPct} onChange={(e) => setOutlierPct(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profitMethod">Método de lucro</Label>
              <select id="profitMethod" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={profitMethod} onChange={(e) => setProfitMethod(e.target.value)}>
                <option value="max">Máximo por símbolo</option>
                <option value="median">Mediana por símbolo</option>
                <option value="p95">Percentil 95 por símbolo</option>
                <option value="average">Média por símbolo</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="oppThreshold">Limiar de oportunidade (%)</Label>
            <Input id="oppThreshold" type="number" step="0.01" value={oppThreshold} onChange={(e) => setOppThreshold(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetSpread">Alvo estratégico de spread (%)</Label>
            <Input id="targetSpread" type="number" step="0.01" value={targetSpread} onChange={(e) => setTargetSpread(e.target.value)} />
          </div>
          <div className="grid gap-2 grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="uiThrottleMs">Atualização mínima da UI (ms)</Label>
              <Input id="uiThrottleMs" type="number" step="100" value={uiThrottleMs} onChange={(e) => setUiThrottleMs(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minHoldMs">Tempo mínimo de exibição (ms)</Label>
              <Input id="minHoldMs" type="number" step="100" value={minHoldMs} onChange={(e) => setMinHoldMs(e.target.value)} />
            </div>
          </div>
          
          <div className="border-t border-border pt-4 mt-2">
            <h4 className="font-semibold mb-3">Arbitragem Inter-Exchange</h4>
            <div className="grid gap-3">
              <div className="grid gap-2 grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="withdrawalFee">Taxa de saque (%)</Label>
                  <Input
                    id="withdrawalFee"
                    type="number"
                    step="0.01"
                    value={withdrawalFee}
                    onChange={(e) => setWithdrawalFee(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="depositFee">Taxa de depósito (%)</Label>
                  <Input
                    id="depositFee"
                    type="number"
                    step="0.01"
                    value={depositFee}
                    onChange={(e) => setDepositFee(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="interExchangeThreshold">Limiar mín. inter-exchange (%)</Label>
                <Input
                  id="interExchangeThreshold"
                  type="number"
                  step="0.1"
                  value={interExchangeThreshold}
                  onChange={(e) => setInterExchangeThreshold(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-2">
            <h4 className="font-semibold mb-3">Sistema de Alertas</h4>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAlerts">Ativar alertas</Label>
                <input
                  id="enableAlerts"
                  type="checkbox"
                  checked={enableAlerts}
                  onChange={(e) => setEnableAlerts(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alertThreshold">Limiar de alerta (% spread)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  step="0.1"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  disabled={!enableAlerts}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enableSound">Notificação sonora</Label>
                <input
                  id="enableSound"
                  type="checkbox"
                  checked={enableSound}
                  onChange={(e) => setEnableSound(e.target.checked)}
                  disabled={!enableAlerts}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Chaves e parâmetros são armazenados localmente (neste navegador).</p>
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
