import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BinanceSpotPrice {
  symbol: string;
  price: string;
}

interface BinanceFuturesPrice {
  symbol: string;
  markPrice: string;
}

interface BinanceTickerVolume {
  symbol: string;
  volume: string;
  quoteVolume: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT',
      'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'LTCUSDT', 'TRXUSDT', 'APTUSDT'
    ];

    // Buscar preços spot
    const spotResponse = await fetch('https://api.binance.com/api/v3/ticker/price');
    const spotPrices: BinanceSpotPrice[] = await spotResponse.json();
    
    // Buscar preços de futuros
    const futuresResponse = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    const futuresPrices: BinanceFuturesPrice[] = await futuresResponse.json();
    
    // Buscar volumes 24h
    const volumeResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const volumes: BinanceTickerVolume[] = await volumeResponse.json();

    const cryptoNames: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'BNBUSDT': 'Binance Coin',
      'SOLUSDT': 'Solana',
      'XRPUSDT': 'Ripple',
      'ADAUSDT': 'Cardano',
      'AVAXUSDT': 'Avalanche',
      'DOGEUSDT': 'Dogecoin',
      'MATICUSDT': 'Polygon',
      'DOTUSDT': 'Polkadot',
      'LINKUSDT': 'Chainlink',
      'UNIUSDT': 'Uniswap',
      'ATOMUSDT': 'Cosmos',
      'LTCUSDT': 'Litecoin',
      'TRXUSDT': 'Tron',
      'APTUSDT': 'Aptos',
    };

    const arbitrageData = symbols.map((symbol) => {
      const spot = spotPrices.find((p) => p.symbol === symbol);
      const futures = futuresPrices.find((p) => p.symbol === symbol);
      const volume = volumes.find((v) => v.symbol === symbol);

      if (!spot || !futures) return null;

      const spotPrice = parseFloat(spot.price);
      const futuresPrice = parseFloat(futures.markPrice);
      const spread = ((futuresPrice - spotPrice) / spotPrice) * 100;
      
      const vol24h = volume ? parseFloat(volume.quoteVolume) : 0;
      const formattedVolume = vol24h > 1e9 
        ? `${(vol24h / 1e9).toFixed(1)}B`
        : vol24h > 1e6 
        ? `${(vol24h / 1e6).toFixed(1)}M`
        : `${(vol24h / 1e3).toFixed(1)}K`;

      return {
        symbol: symbol.replace('USDT', ''),
        name: cryptoNames[symbol] || symbol,
        spotPrice,
        futuresPrice,
        spread,
        volume24h: formattedVolume,
        exchange: 'Binance',
      };
    }).filter(Boolean);

    return new Response(
      JSON.stringify({ data: arbitrageData, timestamp: new Date().toISOString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao buscar dados da Binance:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar dados da Binance' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
