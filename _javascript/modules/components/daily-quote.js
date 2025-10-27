/**
 * 每日一句功能
 * 从API获取每日一句并显示在主页
 */

export function initDailyQuote() {
  const quoteTextEl = document.getElementById('quote-text');
  const quoteFromEl = document.getElementById('quote-from');

  if (!quoteTextEl || !quoteFromEl) {
    //console.log('每日一句元素未找到');
    return;
  }

  //console.log('初始化每日一句功能');

  // 从localStorage获取缓存的每日一句
  const cachedQuote = getCachedQuote();
  if (cachedQuote && !isQuoteExpired(cachedQuote.timestamp)) {
    //console.log('使用缓存的每日一句');
    displayQuote(cachedQuote.data);
    return;
  }

  // 获取新的每日一句
  // 直接使用JSONP方法，因为API有CORS限制
  fetchDailyQuoteWithJSONP();
}

/**
 * 获取每日一句数据（使用多个API备用方案）
 */
async function fetchDailyQuoteWithJSONP() {
  const quoteTextEl = document.getElementById('quote-text');
  const quoteFromEl = document.getElementById('quote-from');

  // 显示默认文案
  const showDefaultQuote = function () {
    quoteTextEl.textContent = '今日无话可说，明日再续。';
    quoteFromEl.textContent = '—— 系统';
  };

  // API列表（按优先级排序）
  const apis = [
    // 方案1: 使用支持CORS的一言API
    {
      name: 'hitokoto官方API',
      url: 'https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=h&c=i&c=j&c=k&c=l',
      method: 'fetch',
      parser: (data) => ({
        hitokoto: data.hitokoto,
        from: data.from,
        from_who: data.from_who
      })
    },
    // 方案2: 使用JSONP方法（备用）
    {
      name: 'JSONP备用API',
      url: 'https://whyta.cn/api/yiyan?key=738b541a5f7a',
      method: 'jsonp',
      parser: (data) => data
    }
  ];

  // 尝试每个API
  for (const api of apis) {
    try {
      if (api.method === 'fetch') {
        const response = await Promise.race([
          fetch(api.url, {
            method: 'GET',
            mode: 'cors',
            headers: {
              Accept: 'application/json'
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), 5000)
          )
        ]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const parsedData = api.parser(data);

        displayQuote(parsedData);
        cacheQuote(parsedData);
        return; // 成功获取，退出
      } else if (api.method === 'jsonp') {
        // JSONP方法
        const result = await fetchWithJSONP(api.url);
        const parsedData = api.parser(result);

        displayQuote(parsedData);
        cacheQuote(parsedData);
        return; // 成功获取，退出
      }
    } catch {
      continue; // 尝试下一个API
    }
  }

  // 所有API都失败，使用默认文案
  // console.log('所有API获取失败，使用默认文案');
  showDefaultQuote();
}

/**
 * JSONP请求封装
 */
function fetchWithJSONP(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = 'dailyQuoteCallback_' + Date.now();
    let isCleaned = false;
    let timeoutId = null;

    // 统一的清理函数
    const cleanup = function () {
      if (isCleaned) return;
      isCleaned = true;

      try {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      } catch {
        // console.warn('清理script标签时出错');
      }

      try {
        if (window[callbackName]) {
          delete window[callbackName];
        }
      } catch {
        // console.warn('清理回调函数时出错');
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // 设置全局回调函数
    window[callbackName] = function (data) {
      if (isCleaned) return;
      cleanup();
      resolve(data);
    };

    script.onerror = function () {
      if (isCleaned) return;
      cleanup();
      reject(new Error('JSONP请求失败'));
    };

    // 设置超时
    timeoutId = setTimeout(() => {
      if (!isCleaned) {
        cleanup();
        reject(new Error('JSONP请求超时'));
      }
    }, 5000);

    // 添加callback参数
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

/**
 * 显示每日一句
 * @param {Object} data - API返回的数据
 */
function displayQuote(data) {
  const quoteTextEl = document.getElementById('quote-text');
  const quoteFromEl = document.getElementById('quote-from');

  if (data && data.hitokoto) {
    quoteTextEl.textContent = data.hitokoto;

    // 构建来源信息
    let fromText = '';
    if (data.from) {
      fromText = data.from;
    }
    if (data.from_who) {
      fromText += fromText ? ` · ${data.from_who}` : data.from_who;
    }

    quoteFromEl.textContent = fromText ? `—— ${fromText}` : '—— 佚名';
  }
}

/**
 * 缓存每日一句数据
 * @param {Object} data - 要缓存的数据
 */
function cacheQuote(data) {
  const cacheData = {
    data: data,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem('daily-quote', JSON.stringify(cacheData));
  } catch {
    //console.warn('无法缓存每日一句数据');
  }
}

/**
 * 获取缓存的每日一句
 * @returns {Object|null} 缓存的数据或null
 */
function getCachedQuote() {
  try {
    const cached = localStorage.getItem('daily-quote');
    return cached ? JSON.parse(cached) : null;
  } catch {
    //console.warn('无法读取缓存的每日一句数据');
    return null;
  }
}

/**
 * 检查每日一句是否过期（24小时）
 * @param {number} timestamp - 缓存时间戳
 * @returns {boolean} 是否过期
 */
function isQuoteExpired(timestamp) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000; // 24小时的毫秒数
  return now - timestamp > oneDay;
}
