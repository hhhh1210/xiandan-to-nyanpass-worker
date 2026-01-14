export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS (handy if you call from other frontends)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/convert") {
      if (request.method !== "POST") {
        return json({ error: "Method Not Allowed" }, 405, corsHeaders);
      }

      let bodyText = "";
      try {
        bodyText = await request.text();
      } catch {
        return json({ error: "无法读取请求内容" }, 400, corsHeaders);
      }

      try {
        const output = convertToNyanpassNdjson(bodyText);
        return new Response(output, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain; charset=UTF-8",
          },
        });
      } catch (e) {
        return json({ error: e?.message || "转换失败" }, 400, corsHeaders);
      }
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...extraHeaders,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
}

/**
 * 输入：咸蛋面板导出的 JSON（字符串）
 * 输出：Nyanpass 规则 NDJSON（每行一个 JSON）
 */
function convertToNyanpassNdjson(xiandanData) {
  let parsed;
  try {
    parsed = typeof xiandanData === "string" ? JSON.parse(xiandanData) : xiandanData;
  } catch (e) {
    throw new Error(`转换失败: JSON 解析失败: ${e.message}`);
  }

  if (!parsed?.forwards || !Array.isArray(parsed.forwards)) {
    throw new Error("无效的咸蛋面板JSON格式：缺少 forwards 数组");
  }

  const nyanpassForwards = parsed.forwards.map((item) => {
    const remoteIp = item.remoteIp || item.remoteHost;
    const remotePort = item.remotePort;

    if (!remoteIp || !remotePort) {
      throw new Error(`转换失败: 缺少 remoteIp/remoteHost 或 remotePort（id=${item?.id ?? "unknown"}）`);
    }

    // dest: ["IP:端口"]
    const dest = `${remoteIp}:${remotePort}`;

    // prefer internetPort, fallback to localPort
    const listenPort = item.internetPort ?? item.localPort;
    if (!listenPort) {
      throw new Error(`转换失败: 缺少 internetPort/localPort（id=${item?.id ?? "unknown"}）`);
    }

    return {
      dest: [dest],
      listen_port: listenPort,
      name: item.remark || `转发_${item.id ?? ""}`.trim() || "转发",
    };
  });

  // NDJSON: one object per line
  return nyanpassForwards.map((o) => JSON.stringify(o)).join("\n");
}

function renderHtml() {
  const userData = `{"forwards":[{"id":11714,"userId":null,"portId":null,"serverId":null,"localPort":22240,"serverName":null,"serverHost":null,"serverDisplayHost":null,"internetPort":22240,"username":null,"remoteIp":"45.196.236.89","remoteHost":"45.196.236.89","dataUsage":null,"dataUsageInput":null,"forwardType":12,"remotePort":8220,"createTime":"2025-09-18","updateTime":"2026-01-13","deleted":false,"disabled":false,"iperf3":false,"state":1,"remark":null,"sendProxy":false,"acceptProxy":false,"speedLimit":1000,"balanceList":[],"isBalance":false,"balanceType":null,"reason":"","hasDynamic":false,"isServer":false,"secure":false,"useServerCert":true,"customHost":null,"customSni":null,"customPath":null,"crt":"","key":"","ping":"2.42 ms","isLine":false,"startLogs":null},{"id":14798,"userId":null,"portId":null,"serverId":null,"localPort":45422,"serverName":null,"serverHost":null,"serverDisplayHost":null,"internetPort":45422,"username":null,"remoteIp":"45.196.236.89","remoteHost":"45.196.236.89","dataUsage":null,"dataUsageInput":null,"forwardType":4,"remotePort":20132,"createTime":"2026-01-13","updateTime":"2026-01-13","deleted":false,"disabled":false,"iperf3":false,"state":1,"remark":null,"sendProxy":false,"acceptProxy":false,"speedLimit":1000,"balanceList":[],"isBalance":false,"balanceType":null,"reason":"","hasDynamic":false,"isServer":false,"secure":false,"useServerCert":true,"customHost":null,"customSni":null,"customPath":null,"crt":"","key":"","ping":"2.55 ms","isLine":false,"startLogs":null}]}`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>咸蛋面板 → Nyanpass 面板</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
  <div class="max-w-7xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">咸蛋面板 → Nyanpass 面板</h1>
      <p class="text-gray-600">转发规则格式转换工具（Worker 版本）</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-800">咸蛋面板JSON</h2>
          <div class="flex gap-2">
            <label class="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition flex items-center gap-2 text-sm">
              ⬆️ 上传
              <input id="file" type="file" accept=".json,application/json" class="hidden" />
            </label>
            <button id="btnExample" class="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 transition text-sm">示例</button>
            <button id="btnUser" class="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 transition text-sm">你的数据</button>
          </div>
        </div>

        <textarea id="input" placeholder="粘贴咸蛋面板导出的JSON数据..."
          class="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>

        <button id="btnConvert"
          class="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition">
          开始转换
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-800">Nyanpass面板JSON</h2>
          <button id="btnDownload" disabled
            class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
            ⬇️ <span class="text-sm">下载</span>
          </button>
        </div>

        <div id="errorBox" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-red-700 text-sm" id="errorText"></div>
        </div>

        <textarea id="output" readonly placeholder="转换后的JSON将显示在这里..."
          class="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"></textarea>

        <div id="okBox" class="hidden mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-800 text-sm font-semibold mb-2">✓ 转换成功！</p>
          <p class="text-green-700 text-sm" id="countText"></p>
        </div>
      </div>
    </div>

    <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">字段映射说明</h3>
      <div class="grid md:grid-cols-3 gap-4 mb-4">
        <div class="p-3 bg-blue-50 rounded border border-blue-200">
          <p class="text-sm font-semibold text-blue-800">咸蛋 → Nyanpass</p>
          <p class="text-xs text-blue-600 mt-1">remoteIp + remotePort → dest</p>
        </div>
        <div class="p-3 bg-blue-50 rounded border border-blue-200">
          <p class="text-sm font-semibold text-blue-800">咸蛋 → Nyanpass</p>
          <p class="text-xs text-blue-600 mt-1">internetPort（或 localPort）→ listen_port</p>
        </div>
        <div class="p-3 bg-blue-50 rounded border border-blue-200">
          <p class="text-sm font-semibold text-blue-800">咸蛋 → Nyanpass</p>
          <p class="text-xs text-blue-600 mt-1">remark → name</p>
        </div>
      </div>

      <h3 class="text-lg font-semibold text-gray-800 mb-3 mt-4">使用步骤</h3>
      <ol class="list-decimal list-inside space-y-2 text-gray-600 text-sm">
        <li>上传咸蛋面板JSON，或直接粘贴到左侧</li>
        <li>点击“开始转换”</li>
        <li>右侧出现结果后点击“下载”保存为 nyanpass-forwards.json</li>
      </ol>

      <div class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p class="text-amber-800 text-sm">
          <strong>格式示例：</strong>remoteIp:x.x.x.x + remotePort:xxxx → dest:["x.x.x.x:xxxx"]
        </p>
      </div>
    </div>
  </div>

<script>
const elInput = document.getElementById("input");
const elOutput = document.getElementById("output");
const elFile = document.getElementById("file");
const btnConvert = document.getElementById("btnConvert");
const btnDownload = document.getElementById("btnDownload");
const btnExample = document.getElementById("btnExample");
const btnUser = document.getElementById("btnUser");
const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");
const okBox = document.getElementById("okBox");
const countText = document.getElementById("countText");

function showError(msg) {
  errorText.textContent = msg;
  errorBox.classList.remove("hidden");
  okBox.classList.add("hidden");
}
function clearError() {
  errorText.textContent = "";
  errorBox.classList.add("hidden");
}
function showOk(lines) {
  okBox.classList.remove("hidden");
  countText.textContent = "共转换 " + lines + " 条转发规则";
}

elFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  elInput.value = text;
});

btnExample.addEventListener("click", () => {
  elInput.value = JSON.stringify({
    forwards: [
      { id: 11714, localPort: 22240, internetPort: 22240, remoteIp: "x.x.x.x", remotePort: 8220, remark: "测试转发1", state: 1 },
      { id: 11530, localPort: 52108, internetPort: 52108, remoteIp: "x.x.x.x", remotePort: 20132, remark: "测试转发2", state: 1 }
    ]
  }, null, 2);
});

btnUser.addEventListener("click", () => {
  elInput.value = ${JSON.stringify(userData)};
});

btnConvert.addEventListener("click", async () => {
  clearError();
  okBox.classList.add("hidden");
  elOutput.value = "";
  btnDownload.disabled = true;

  const input = elInput.value.trim();
  if (!input) {
    showError("请输入JSON数据");
    return;
  }

  try {
    const resp = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: input
    });

    if (!resp.ok) {
      let err = "转换失败";
      try {
        const j = await resp.json();
        err = j?.error || err;
      } catch {}
      showError(err);
      return;
    }

    const text = await resp.text();
    elOutput.value = text;
    btnDownload.disabled = !text;
    if (text) showOk(text.split("\\n").filter(Boolean).length);
  } catch (e) {
    showError(e?.message || "请求失败");
  }
});

btnDownload.addEventListener("click", () => {
  const output = elOutput.value;
  if (!output) return;
  const blob = new Blob([output], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nyanpass-forwards.json";
  a.click();
  URL.revokeObjectURL(url);
});
</script>
</body>
</html>`;
}
