(function () {
  var script = document.currentScript;
  if (!script) return;
  var formId = script.getAttribute("data-form-id");
  var targetSel = script.getAttribute("data-target") || "#ctrldone-form";
  if (!formId) return;

  var origin = script.src ? script.src.replace(/\/embed\.js(?:\?.*)?$/, "") : "";
  var mount = document.querySelector(targetSel);
  if (!mount) {
    mount = document.createElement("div");
    script.parentNode.insertBefore(mount, script);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k === "text") {
          node.textContent = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  fetch(origin + "/api/forms/" + formId)
    .then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || "Failed to load form");
        return j;
      });
    })
    .then(function (form) {
      var formEl = el("form", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "420px",
        },
      });
      formEl.appendChild(
        el("h3", {
          text: form.name || "Form",
          style: { margin: "0 0 4px", fontSize: "18px" },
        })
      );

      (form.fields || []).forEach(function (f) {
        var label = el("label", {
          style: { display: "block", fontSize: "12px", color: "#6b7280" },
          text: f.label + (f.required ? " *" : ""),
        });
        var input;
        if (f.type === "boolean") {
          input = el("select", {
            name: f.key,
            required: f.required ? "required" : undefined,
            style: {
              display: "block",
              width: "100%",
              marginTop: "4px",
              padding: "10px 12px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
            },
          });
          input.appendChild(el("option", { value: "", text: "Select…" }));
          input.appendChild(el("option", { value: "true", text: "Yes" }));
          input.appendChild(el("option", { value: "false", text: "No" }));
        } else {
          input = el("input", {
            name: f.key,
            type:
              f.type === "number"
                ? "number"
                : f.type === "date"
                  ? "date"
                  : f.key === "email"
                    ? "email"
                    : "text",
            required: f.required ? "required" : undefined,
            style: {
              display: "block",
              width: "100%",
              marginTop: "4px",
              padding: "10px 12px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              boxSizing: "border-box",
            },
          });
        }
        label.appendChild(input);
        formEl.appendChild(label);
      });

      var status = el("p", {
        style: { margin: 0, fontSize: "13px", color: "#6b7280", display: "none" },
      });
      var btn = el("button", {
        type: "submit",
        text: "Submit",
        style: {
          padding: "12px 18px",
          borderRadius: "999px",
          border: "none",
          background: "#1a3d32",
          color: "#fff",
          cursor: "pointer",
          fontWeight: "600",
        },
      });
      formEl.appendChild(btn);
      formEl.appendChild(status);

      formEl.addEventListener("submit", function (e) {
        e.preventDefault();
        var payload = {};
        (form.fields || []).forEach(function (f) {
          var field = formEl.elements.namedItem(f.key);
          payload[f.key] = field && "value" in field ? field.value : "";
        });
        btn.disabled = true;
        status.style.display = "block";
        status.style.color = "#6b7280";
        status.textContent = "Sending…";
        fetch(origin + "/api/forms/" + formId + "/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return r.json().then(function (j) {
              if (!r.ok) throw new Error(j.error || "Submit failed");
              return j;
            });
          })
          .then(function () {
            status.style.color = "#1a3d32";
            status.textContent = "Thanks — submitted.";
            formEl.reset();
          })
          .catch(function (err) {
            status.style.color = "#b91c1c";
            status.textContent = err.message || "Submit failed";
          })
          .finally(function () {
            btn.disabled = false;
          });
      });

      mount.innerHTML = "";
      mount.appendChild(formEl);
    })
    .catch(function (err) {
      mount.textContent = err.message || "Could not load form";
    });
})();
