import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangePrice {
  symbol: string;
  price: string;
}

interface ExchangeVolume {
  symbol: string;
  volume: string;
  quoteVolume: string;
}

interface BybitTicker {
  symbol: string;
  lastPrice: string;
  volume24h: string;
  turnover24h: string;
}

interface OkxTicker {
  instId: string;
  last: string;
  vol24h: string;
  volCcy24h: string;
}

interface GateioTicker {
  currency_pair: string;
  last: string;
  quote_volume: string;
}

interface KucoinTicker {
  symbol: string;
  last: string;
  volValue: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT',
      'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'LTCUSDT', 'TRXUSDT', 'APTUSDT'
    ];

    // ===== FETCH ALL EXCHANGES =====
    const [
      bybitResponse,
      okxResponse,
      mexcSpotResponse,
      mexcVolumeResponse,
      gateioResponse,
      bitgetResponse,
      kucoinResponse
    ] = await Promise.all([
      fetch('https://api.bybit.com/v5/market/tickers?category=spot'),
      fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT'),
      fetch('https://api.mexc.com/api/v3/ticker/price'),
      fetch('https://api.mexc.com/api/v3/ticker/24hr'),
      fetch('https://api.gateio.ws/api/v4/spot/tickers'),
      fetch('https://api.bitget.com/api/v2/spot/market/tickers'),
      fetch('https://api.kucoin.com/api/v1/market/allTickers')
    ]);

    const bybitData = await bybitResponse.json();
    const okxData = await okxResponse.json();
    const mexcSpotPrices: ExchangePrice[] = await mexcSpotResponse.json();
    const mexcVolumes: ExchangeVolume[] = await mexcVolumeResponse.json();
    const gateioData = await gateioResponse.json();
    const bitgetData = await bitgetResponse.json();
    const kucoinData = await kucoinResponse.json();

    const bybitTickers: BybitTicker[] = bybitData.result?.list || [];
    const okxTickers: OkxTicker[] = okxData.data || [];
    const gateioTickers: GateioTicker[] = gateioData || [];
    const bitgetTickers = bitgetData.data || [];
    const kucoinTickers: KucoinTicker[] = kucoinData.data?.ticker || [];

    const cryptoNames: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
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

    const exchangeUrls: Record<string, { spot: string; futures: string }> = {
      'Bybit': {
        spot: 'https://www.bybit.com/trade/spot',
        futures: 'https://www.bybit.com/trade/usdt'
      },
      'OKX': {
        spot: 'https://www.okx.com/trade-spot',
        futures: 'https://www.okx.com/trade-swap'
      },
      'MEXC': {
        spot: 'https://www.mexc.com/exchange',
        futures: 'https://futures.mexc.com/exchange'
      },
      'Gate.io': {
        spot: 'https://www.gate.io/trade',
        futures: 'https://www.gate.io/futures_trade'
      },
      'Bitget': {
        spot: 'https://www.bitget.com/spot',
        futures: 'https://www.bitget.com/futures'
      },
      'KuCoin': {
        spot: 'https://www.kucoin.com/trade',
        futures: 'https://www.kucoin.com/futures'
      },
      'BingX': {
        spot: 'https://bingx.com/en-us/spot',
        futures: 'https://bingx.com/en-us/perpetual'
      }
    };

    const formatVolume = (vol24h: number) => {
      return vol24h > 1e9 
        ? `${(vol24h / 1e9).toFixed(1)}B`
        : vol24h > 1e6 
        ? `${(vol24h / 1e6).toFixed(1)}M`
        : `${(vol24h / 1e3).toFixed(1)}K`;
    };

    // Helper para obter preço e volume de cada exchange
    const getExchangePrice = (symbol: string, exchange: string): { price: number; volume: number } | null => {
      try {
        switch(exchange) {
          case 'Bybit': {
            const ticker = bybitTickers.find((t: BybitTicker) => t.symbol === symbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.lastPrice),
              volume: parseFloat(ticker.turnover24h || '0')
            };
          }
          case 'OKX': {
            const okxSymbol = symbol.replace('USDT', '-USDT');
            const ticker = okxTickers.find((t: OkxTicker) => t.instId === okxSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.last),
              volume: parseFloat(ticker.volCcy24h || '0')
            };
          }
          case 'MEXC': {
            const price = mexcSpotPrices.find((p) => p.symbol === symbol);
            const vol = mexcVolumes.find((v) => v.symbol === symbol);
            if (!price) return null;
            return {
              price: parseFloat(price.price),
              volume: vol ? parseFloat(vol.quoteVolume) : 0
            };
          }
          case 'Gate.io': {
            const gateSymbol = symbol.replace('USDT', '_USDT');
            const ticker = gateioTickers.find((t: GateioTicker) => t.currency_pair === gateSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.last),
              volume: parseFloat(ticker.quote_volume || '0')
            };
          }
          case 'Bitget': {
            const ticker = bitgetTickers.find((t: any) => t.symbol === symbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.lastPr || '0'),
              volume: parseFloat(ticker.quoteVolume || '0')
            };
          }
          case 'KuCoin': {
            const kucoinSymbol = symbol.replace('USDT', '-USDT');
            const ticker = kucoinTickers.find((t: KucoinTicker) => t.symbol === kucoinSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.last),
              volume: parseFloat(ticker.volValue || '0')
            };
          }
          default:
            return null;
        }
      } catch (e) {
        console.error(`Error getting ${exchange} price for ${symbol}:`, e);
        return null;
      }
    };

    // ===== ARBITRAGEM INTER-EXCHANGE =====
    const exchanges = ['Bybit', 'OKX', 'MEXC', 'Gate.io', 'Bitget', 'KuCoin'];
    const interExchangeArb: any[] = [];

    symbols.forEach((symbol) => {
      const prices: Array<{ exchange: string; price: number; volume: number }> = [];
      
      exchanges.forEach((exchange) => {
        const data = getExchangePrice(symbol, exchange);
        if (data && isFinite(data.price) && data.price > 0) {
          prices.push({ exchange, ...data });
        }
      });

      if (prices.length < 2) return;

      // Encontrar maior e menor preço
      prices.sort((a, b) => a.price - b.price);
      const lowest = prices[0];
      const highest = prices[prices.length - 1];

      const spread = ((highest.price - lowest.price) / lowest.price) * 100;

      if (Math.abs(spread) > 0.3 && Math.abs(spread) < 10) {
        interExchangeArb.push({
          symbol: symbol.replace('USDT', ''),
          name: cryptoNames[symbol] || symbol,
          buyExchange: lowest.exchange,
          sellExchange: highest.exchange,
          buyPrice: lowest.price,
          sellPrice: highest.price,
          spread,
          buyVolume: formatVolume(lowest.volume),
          sellVolume: formatVolume(highest.volume),
          type: 'inter-exchange',
          spotUrl: `${exchangeUrls[lowest.exchange]?.spot}/${symbol}`,
          buySpotUrl: `${exchangeUrls[lowest.exchange]?.spot}/${symbol}`,
          sellSpotUrl: `${exchangeUrls[highest.exchange]?.spot}/${symbol}`
        });
      }
    });

    console.log(`✅ Found ${interExchangeArb.length} inter-exchange opportunities`);

    return new Response(
      JSON.stringify({ 
        data: [], // Removido dados de spot-futuros
        interExchange: interExchangeArb,
        timestamp: new Date().toISOString() 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao buscar dados das exchanges:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar dados das exchanges' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
