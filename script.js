function onPlutoReady()
{
	if (!localStorage.getItem("private_p") || !localStorage.getItem("private_q"))
	{
		document.getElementById("generating-private-key").style.display = "block";
		setTimeout(function()
		{
			pluto_invoke("generate_private_key").then(function(ret)
			{
				localStorage.setItem("private_p", ret[0]);
				localStorage.setItem("private_q", ret[1]);
				document.getElementById("generating-private-key").style.display = "none";
				onCryptoReady();
			});
		},100);
	}
	else
	{
		onCryptoReady();
	}
}

function onCryptoReady()
{
	refresh_linked();
	document.getElementById("nodes-view").style.display = "block";
	document.getElementById("link-btn").onclick = function()
	{
		pluto_invoke("link", document.getElementById("link-data").value);
	};
	document.getElementById("dns-add").onclick = function()
	{
		pluto_invoke("app_request", "dns_add_record", JSON.stringify({
			name: document.getElementById("dns-name").value.toLowerCase(),
			type: document.getElementById("dns-type").value.toUpperCase(),
			value: document.getElementById("dns-value").value
		})).then(() => {
			pluto_invoke("refresh_dns_records");
		});
	};
}

function get_private_key()
{
	return [ localStorage.getItem("private_p"), localStorage.getItem("private_q") ];
}

window.message_deque = [];

function ws_open(ip)
{
	return new Promise(resolve => {
		window.ws = new WebSocket("ws://"+ip+":7106");
		ws.onopen = function()
		{
			resolve();
		};
		ws.onmessage = function(event)
		{
			event.data.arrayBuffer().then(ab => {
				if (message_resolve)
				{
					let f = message_resolve;
					message_resolve = undefined;
					f(new Uint8Array(ab));
				}
				else
				{
					message_deque.push(new Uint8Array(ab));
				}
			});
		};
	});
}

function ws_send(data)
{
	ws.send(obj2arr(data));
}

function ws_recv()
{
	return new Promise(resolve => {
		if (message_deque.length)
		{
			resolve(message_deque.shift());
		}
		else
		{
			window.message_resolve = resolve;
		}
	})
}

function obj2arr(obj)
{
	let arr = new Uint8Array(Object.keys(obj).length);
	for (let i = 0; i != arr.length; ++i)
	{
		arr[i] = obj[i];
	}
	return arr;
}

function refresh_linked()
{
	document.querySelector("#nodes-view ul").innerHTML = "";
	window.linked = JSON.parse(localStorage.getItem("linked") ?? "[]");
	window.linked.forEach(node => {
		let li = document.createElement("li");
		let a = document.createElement("a");
		a.textContent = node.ip;
		a.href = "#";
		a.onclick = function()
		{
			document.getElementById("nodes-view").style.display = "none";
			document.getElementById("node-view").style.display = "block";
			document.getElementById("node-ip").textContent = node.ip;
			pluto_invoke("connect", node.ip, node.pub_n).then(function(capabilities)
			{
				capabilities = Object.values(capabilities);

				if (capabilities.includes("dns_list_records"))
				{
					document.getElementById("node-status").style.display = "none";
					document.querySelector("#node-dns table").textContent = "Loading...";
					pluto_invoke("refresh_dns_records");
				}
				else
				{
					document.getElementById("node-status").textContent = "This node has no capabilities that are supported by this client.";
				}
			});
		};
		li.appendChild(a);
		document.querySelector("#nodes-view ul").appendChild(li);
	});
}

function add_linked(ip, pub_n)
{
	linked.push({ ip, pub_n });
	localStorage.setItem("linked", JSON.stringify(linked));
	refresh_linked();
	document.getElementById("link-data").value = "";
}

function add_dns_record(rec)
{
	let tr = document.createElement("tr");
	{
		let td = document.createElement("td");
		td.textContent = rec.name;
		tr.appendChild(td);
	}
	{
		let td = document.createElement("td");
		td.textContent = rec.type;
		tr.appendChild(td);
	}
	{
		let td = document.createElement("td");
		td.textContent = rec.value;
		tr.appendChild(td);
	}
	{
		let td = document.createElement("td");
		{
			let button = document.createElement("button");
			button.textContent = "Delete";
			button.onclick = function()
			{
				pluto_invoke("app_request", "dns_remove_record", JSON.stringify(rec)).then(() => {
					pluto_invoke("refresh_dns_records");
				});
			};
			td.appendChild(button);
		}
		tr.appendChild(td);
	}
	document.querySelector("#node-dns table").appendChild(tr);
}
