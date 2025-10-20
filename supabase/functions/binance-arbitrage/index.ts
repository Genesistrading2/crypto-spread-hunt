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

    // ===== FETCH ALL EXCHANGES (SPOT + FUTURES) =====
    const [
      bybitResponse,
      bybitFuturesResponse,
      okxResponse,
      okxFuturesResponse,
      mexcSpotResponse,
      mexcVolumeResponse,
      gateioResponse,
      gateioFuturesResponse,
      bitgetResponse,
      bitgetFuturesResponse,
      kucoinResponse,
      kucoinFuturesResponse
    ] = await Promise.all([
      fetch('https://api.bybit.com/v5/market/tickers?category=spot'),
      fetch('https://api.bybit.com/v5/market/tickers?category=linear'),
      fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT'),
      fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP'),
      fetch('https://api.mexc.com/api/v3/ticker/price'),
      fetch('https://api.mexc.com/api/v3/ticker/24hr'),
      fetch('https://api.gateio.ws/api/v4/spot/tickers'),
      fetch('https://api.gateio.ws/api/v4/futures/usdt/tickers'),
      fetch('https://api.bitget.com/api/v2/spot/market/tickers'),
      fetch('https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES'),
      fetch('https://api.kucoin.com/api/v1/market/allTickers'),
      fetch('https://api-futures.kucoin.com/api/v1/contracts/active')
    ]);

    const bybitData = await bybitResponse.json();
    const bybitFuturesData = await bybitFuturesResponse.json();
    const okxData = await okxResponse.json();
    const okxFuturesData = await okxFuturesResponse.json();
    const mexcSpotPrices: ExchangePrice[] = await mexcSpotResponse.json();
    const mexcVolumes: ExchangeVolume[] = await mexcVolumeResponse.json();
    const gateioData = await gateioResponse.json();
    const gateioFuturesData = await gateioFuturesResponse.json();
    const bitgetData = await bitgetResponse.json();
    const bitgetFuturesData = await bitgetFuturesResponse.json();
    const kucoinData = await kucoinResponse.json();
    const kucoinFuturesData = await kucoinFuturesResponse.json();

    const bybitTickers: BybitTicker[] = bybitData.result?.list || [];
    const bybitFuturesTickers: BybitTicker[] = bybitFuturesData.result?.list || [];
    const okxTickers: OkxTicker[] = okxData.data || [];
    const okxFuturesTickers: OkxTicker[] = okxFuturesData.data || [];
    const gateioTickers: GateioTicker[] = gateioData || [];
    const gateioFuturesTickers = gateioFuturesData || [];
    const bitgetTickers = bitgetData.data || [];
    const bitgetFuturesTickers = bitgetFuturesData.data || [];
    const kucoinTickers: KucoinTicker[] = kucoinData.data?.ticker || [];
    const kucoinFuturesTickers = kucoinFuturesData.data || [];

    console.log(`📊 Dados SPOT recebidos: Bybit=${bybitTickers.length}, OKX=${okxTickers.length}, MEXC=${mexcSpotPrices.length}, Gate.io=${gateioTickers.length}, Bitget=${bitgetTickers.length}, KuCoin=${kucoinTickers.length}`);
    console.log(`📊 Dados FUTUROS recebidos: Bybit=${bybitFuturesTickers.length}, OKX=${okxFuturesTickers.length}, Gate.io=${gateioFuturesTickers.length}, Bitget=${bitgetFuturesTickers.length}, KuCoin=${kucoinFuturesTickers.length}`);

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

    // Helper para formatar símbolo conforme cada exchange
    const formatSymbolForExchange = (symbol: string, exchange: string, isFutures: boolean = false): string => {
      const baseSymbol = symbol.replace('USDT', '');
      
      switch(exchange) {
        case 'Bybit':
          return isFutures ? symbol : symbol;
        case 'OKX':
          return isFutures ? `${baseSymbol}-USDT-SWAP` : `${baseSymbol}-USDT`;
        case 'MEXC':
          return symbol;
        case 'Gate.io':
          return isFutures ? `${baseSymbol}_USDT` : `${baseSymbol}_USDT`;
        case 'Bitget':
          return isFutures ? `${symbol}UMCBL` : symbol;
        case 'KuCoin':
          return isFutures ? `${symbol}M` : `${baseSymbol}-USDT`;
        default:
          return symbol;
      }
    };

    const getExchangeUrls = (symbol: string, exchange: string): { spot: string; futures: string } => {
      const spotSymbol = formatSymbolForExchange(symbol, exchange, false);
      const futuresSymbol = formatSymbolForExchange(symbol, exchange, true);
      
      const urls: Record<string, { spot: string; futures: string }> = {
        'Bybit': {
          spot: `https://www.bybit.com/trade/spot/${spotSymbol}`,
          futures: `https://www.bybit.com/trade/usdt/${futuresSymbol}`
        },
        'OKX': {
          spot: `https://www.okx.com/trade-spot/${spotSymbol}`,
          futures: `https://www.okx.com/trade-swap/${futuresSymbol}`
        },
        'MEXC': {
          spot: `https://www.mexc.com/exchange/${spotSymbol}`,
          futures: `https://futures.mexc.com/exchange/${futuresSymbol}`
        },
        'Gate.io': {
          spot: `https://www.gate.io/trade/${spotSymbol}`,
          futures: `https://www.gate.io/futures_trade/USDT/${futuresSymbol}`
        },
        'Bitget': {
          spot: `https://www.bitget.com/spot/${spotSymbol}`,
          futures: `https://www.bitget.com/futures/usdt/${futuresSymbol}`
        },
        'KuCoin': {
          spot: `https://www.kucoin.com/trade/${spotSymbol}`,
          futures: `https://www.kucoin.com/futures/trade/${futuresSymbol}`
        }
      };
      
      return urls[exchange] || { spot: '', futures: '' };
    };

    const formatVolume = (vol24h: number) => {
      return vol24h > 1e9 
        ? `${(vol24h / 1e9).toFixed(1)}B`
        : vol24h > 1e6 
        ? `${(vol24h / 1e6).toFixed(1)}M`
        : `${(vol24h / 1e3).toFixed(1)}K`;
    };

    // Helper para obter preço e volume de cada exchange (SPOT)
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
        console.error(`Error getting ${exchange} spot price for ${symbol}:`, e);
        return null;
      }
    };

    // Helper para obter preço de FUTUROS de cada exchange
    const getFuturesPrice = (symbol: string, exchange: string): { price: number; volume: number } | null => {
      try {
        const futuresSymbol = symbol.replace('USDT', 'USDT'); // Para futuros, muitas vezes é igual ou com sufixo
        switch(exchange) {
          case 'Bybit': {
            const ticker = bybitFuturesTickers.find((t: BybitTicker) => t.symbol === futuresSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.lastPrice),
              volume: parseFloat(ticker.turnover24h || '0')
            };
          }
          case 'OKX': {
            const okxSymbol = symbol.replace('USDT', '-USDT-SWAP');
            const ticker = okxFuturesTickers.find((t: OkxTicker) => t.instId === okxSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.last),
              volume: parseFloat(ticker.volCcy24h || '0')
            };
          }
          case 'Gate.io': {
            const gateSymbol = symbol.replace('USDT', '_USDT');
            const ticker = gateioFuturesTickers.find((t: any) => t.contract === gateSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.last || '0'),
              volume: parseFloat(ticker.volume_24h_usd || '0')
            };
          }
          case 'Bitget': {
            const bitgetSymbol = symbol + '_UMCBL';
            const ticker = bitgetFuturesTickers.find((t: any) => t.symbol === bitgetSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.lastPr || '0'),
              volume: parseFloat(ticker.usdtVolume || '0')
            };
          }
          case 'KuCoin': {
            const kucoinSymbol = symbol + 'M';
            const ticker = kucoinFuturesTickers.find((t: any) => t.symbol === kucoinSymbol);
            if (!ticker) return null;
            return {
              price: parseFloat(ticker.lastTradePrice || '0'),
              volume: parseFloat(ticker.turnoverOf24h || '0')
            };
          }
          default:
            return null;
        }
      } catch (e) {
        console.error(`Error getting ${exchange} futures price for ${symbol}:`, e);
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

      if (prices.length < 2) {
        console.log(`⚠️ ${symbol}: apenas ${prices.length} exchanges com preço válido`);
        return;
      }

      // Encontrar maior e menor preço
      prices.sort((a, b) => a.price - b.price);
      const lowest = prices[0];
      const highest = prices[prices.length - 1];

      const spread = ((highest.price - lowest.price) / lowest.price) * 100;

      console.log(`💱 ${symbol}: ${lowest.exchange} $${lowest.price.toFixed(2)} → ${highest.exchange} $${highest.price.toFixed(2)} = ${spread.toFixed(2)}%`);

      if (Math.abs(spread) >= 0.05 && Math.abs(spread) < 10) {
        const buyUrls = getExchangeUrls(symbol, lowest.exchange);
        const sellUrls = getExchangeUrls(symbol, highest.exchange);
        
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
          spotUrl: buyUrls.spot,
          buySpotUrl: buyUrls.spot,
          sellSpotUrl: sellUrls.spot
        });
      }
    });

    console.log(`✅ Found ${interExchangeArb.length} inter-exchange opportunities`);

    // ===== ARBITRAGEM SPOT X FUTUROS (MESMA EXCHANGE E ENTRE EXCHANGES) =====
    const spotFuturesArb: any[] = [];

    symbols.forEach((symbol) => {
      exchanges.forEach((exchange) => {
        const spotData = getExchangePrice(symbol, exchange);
        const futuresData = getFuturesPrice(symbol, exchange);
        
        if (spotData && futuresData && isFinite(spotData.price) && spotData.price > 0 && isFinite(futuresData.price) && futuresData.price > 0) {
          const spread = ((futuresData.price - spotData.price) / spotData.price) * 100;
          
          console.log(`🔀 ${symbol} ${exchange}: Spot $${spotData.price.toFixed(2)} / Fut $${futuresData.price.toFixed(2)} = ${spread.toFixed(2)}%`);
          
          if (Math.abs(spread) >= 0.05 && Math.abs(spread) < 10) {
            const urls = getExchangeUrls(symbol, exchange);
            
            spotFuturesArb.push({
              symbol: symbol.replace('USDT', ''),
              name: cryptoNames[symbol] || symbol,
              exchange,
              spotPrice: spotData.price,
              futuresPrice: futuresData.price,
              spread,
              volume24h: formatVolume(spotData.volume),
              type: 'spot-futures',
              spotUrl: urls.spot,
              futuresUrl: urls.futures
            });
          }
        }
      });
      
      // Spot-Futures ENTRE exchanges diferentes
      const spotPrices: Array<{ exchange: string; price: number; volume: number }> = [];
      const futuresPrices: Array<{ exchange: string; price: number; volume: number }> = [];
      
      exchanges.forEach((exchange) => {
        const spotData = getExchangePrice(symbol, exchange);
        const futuresData = getFuturesPrice(symbol, exchange);
        if (spotData && isFinite(spotData.price) && spotData.price > 0) {
          spotPrices.push({ exchange, ...spotData });
        }
        if (futuresData && isFinite(futuresData.price) && futuresData.price > 0) {
          futuresPrices.push({ exchange, ...futuresData });
        }
      });

      // Encontrar melhor combinação: comprar spot em uma exchange e vender futuros em outra
      if (spotPrices.length > 0 && futuresPrices.length > 0) {
        spotPrices.sort((a, b) => a.price - b.price);
        futuresPrices.sort((a, b) => b.price - a.price);
        
        const lowestSpot = spotPrices[0];
        const highestFutures = futuresPrices[0];
        
        if (lowestSpot.exchange !== highestFutures.exchange) {
          const spread = ((highestFutures.price - lowestSpot.price) / lowestSpot.price) * 100;
          
          console.log(`🌐 ${symbol} Cross: Spot ${lowestSpot.exchange} $${lowestSpot.price.toFixed(2)} → Fut ${highestFutures.exchange} $${highestFutures.price.toFixed(2)} = ${spread.toFixed(2)}%`);
          
          if (Math.abs(spread) >= 0.05 && Math.abs(spread) < 10) {
            const spotUrls = getExchangeUrls(symbol, lowestSpot.exchange);
            const futuresUrls = getExchangeUrls(symbol, highestFutures.exchange);
            
            spotFuturesArb.push({
              symbol: symbol.replace('USDT', ''),
              name: cryptoNames[symbol] || symbol,
              exchange: `${lowestSpot.exchange} → ${highestFutures.exchange}`,
              spotPrice: lowestSpot.price,
              futuresPrice: highestFutures.price,
              spread,
              volume24h: formatVolume(Math.min(lowestSpot.volume, highestFutures.volume)),
              type: 'spot-futures-cross',
              spotUrl: spotUrls.spot,
              futuresUrl: futuresUrls.futures,
              buyExchange: lowestSpot.exchange,
              sellExchange: highestFutures.exchange
            });
          }
        }
      }
    });

    console.log(`✅ Found ${spotFuturesArb.length} spot-futures opportunities`);

    return new Response(
      JSON.stringify({ 
        data: spotFuturesArb,
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
