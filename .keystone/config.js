"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __glob = (map) => (path) => {
  var fn = map[path];
  if (fn) return fn();
  throw new Error("Module not found in bundle: " + path);
};
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// features/integrations/payment/stripe.ts
var stripe_exports = {};
__export(stripe_exports, {
  capturePaymentFunction: () => capturePaymentFunction,
  createPaymentFunction: () => createPaymentFunction,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction,
  getPaymentStatusFunction: () => getPaymentStatusFunction,
  handleWebhookFunction: () => handleWebhookFunction,
  refundPaymentFunction: () => refundPaymentFunction
});
async function createPaymentFunction({ order, amount, currency }) {
  const stripe2 = getStripeClient2();
  const paymentIntent = await stripe2.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    automatic_payment_methods: {
      enabled: true
    },
    metadata: {
      orderId: order?.id || "",
      orderNumber: order?.orderNumber || ""
    }
  });
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
}
async function capturePaymentFunction({ paymentId, amount }) {
  const stripe2 = getStripeClient2();
  const paymentIntent = await stripe2.paymentIntents.capture(paymentId, {
    amount_to_capture: amount
  });
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount_captured,
    data: paymentIntent
  };
}
async function refundPaymentFunction({ paymentId, amount }) {
  const stripe2 = getStripeClient2();
  const refund = await stripe2.refunds.create({
    payment_intent: paymentId,
    amount
  });
  return {
    status: refund.status,
    amount: refund.amount,
    data: refund
  };
}
async function getPaymentStatusFunction({ paymentId }) {
  const stripe2 = getStripeClient2();
  const paymentIntent = await stripe2.paymentIntents.retrieve(paymentId);
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    data: paymentIntent
  };
}
async function generatePaymentLinkFunction({ paymentId }) {
  return `https://dashboard.stripe.com/payments/${paymentId}`;
}
async function handleWebhookFunction({ event, headers }) {
  const webhookSecret2 = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret2) {
    throw new Error("Stripe webhook secret is not configured");
  }
  const stripe2 = getStripeClient2();
  try {
    const stripeEvent = stripe2.webhooks.constructEvent(
      JSON.stringify(event),
      headers["stripe-signature"],
      webhookSecret2
    );
    return {
      isValid: true,
      event: stripeEvent,
      type: stripeEvent.type,
      resource: stripeEvent.data.object
    };
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err?.message || "Unknown error"}`);
  }
}
var import_stripe2, getStripeClient2;
var init_stripe = __esm({
  "features/integrations/payment/stripe.ts"() {
    "use strict";
    import_stripe2 = __toESM(require("stripe"));
    getStripeClient2 = () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        throw new Error("Stripe secret key not configured");
      }
      return new import_stripe2.default(stripeKey);
    };
  }
});

// features/integrations/payment/paypal.ts
var paypal_exports = {};
__export(paypal_exports, {
  capturePaymentFunction: () => capturePaymentFunction2,
  createPaymentFunction: () => createPaymentFunction2,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction2,
  getPaymentStatusFunction: () => getPaymentStatusFunction2,
  handleWebhookFunction: () => handleWebhookFunction2,
  refundPaymentFunction: () => refundPaymentFunction2
});
async function handleWebhookFunction2({ event, headers }) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("PayPal webhook ID is not configured");
  }
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: event
      })
    }
  );
  const verification = await response.json();
  const isValid = verification.verification_status === "SUCCESS";
  if (!isValid) {
    throw new Error("Invalid webhook signature");
  }
  return {
    isValid: true,
    event,
    type: event.event_type,
    resource: event.resource
  };
}
async function createPaymentFunction2({ order, amount, currency }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      intent: "AUTHORIZE",
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: formatPayPalAmount(amount, currency)
          },
          custom_id: order?.id
        }
      ]
    })
  });
  const orderResult = await response.json();
  if (orderResult.error) {
    throw new Error(`PayPal order creation failed: ${orderResult.error.message}`);
  }
  return {
    orderId: orderResult.id,
    status: orderResult.status
  };
}
async function capturePaymentFunction2({ paymentId }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${paymentId}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  const capture = await response.json();
  if (capture.error) {
    throw new Error(`PayPal capture failed: ${capture.error.message}`);
  }
  const capturedAmount = capture.purchase_units[0].payments.captures[0].amount;
  return {
    status: capture.status,
    amount: parsePayPalAmount(capturedAmount.value, capturedAmount.currency_code),
    data: capture
  };
}
async function refundPaymentFunction2({ paymentId, amount, currency = "USD" }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(
    `${baseUrl}/v2/payments/captures/${paymentId}/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        amount: {
          value: formatPayPalAmount(amount, currency),
          currency_code: currency.toUpperCase()
        }
      })
    }
  );
  const refund = await response.json();
  if (refund.error) {
    throw new Error(`PayPal refund failed: ${refund.error.message}`);
  }
  return {
    status: refund.status,
    amount: parsePayPalAmount(refund.amount.value, refund.amount.currency_code),
    data: refund
  };
}
async function getPaymentStatusFunction2({ paymentId }) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paymentId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });
  const orderResult = await response.json();
  if (orderResult.error) {
    throw new Error(`PayPal status check failed: ${orderResult.error.message}`);
  }
  const orderAmount = orderResult.purchase_units[0].amount;
  return {
    status: orderResult.status,
    amount: parsePayPalAmount(orderAmount.value, orderAmount.currency_code),
    data: orderResult
  };
}
async function generatePaymentLinkFunction2({ paymentId }) {
  return `https://www.paypal.com/activity/payment/${paymentId}`;
}
var NO_DIVISION_CURRENCIES, getPayPalBaseUrl, formatPayPalAmount, parsePayPalAmount, getPayPalAccessToken;
var init_paypal = __esm({
  "features/integrations/payment/paypal.ts"() {
    "use strict";
    NO_DIVISION_CURRENCIES = [
      "JPY",
      "KRW",
      "VND",
      "CLP",
      "PYG",
      "XAF",
      "XOF",
      "BIF",
      "DJF",
      "GNF",
      "KMF",
      "MGA",
      "RWF",
      "XPF",
      "HTG",
      "VUV",
      "XAG",
      "XDR",
      "XAU"
    ];
    getPayPalBaseUrl = () => {
      const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX !== "false";
      return isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    };
    formatPayPalAmount = (amount, currency) => {
      const upperCurrency = currency.toUpperCase();
      const isNoDivision = NO_DIVISION_CURRENCIES.includes(upperCurrency);
      if (isNoDivision) {
        return amount.toString();
      }
      return (amount / 100).toFixed(2);
    };
    parsePayPalAmount = (value, currency) => {
      const upperCurrency = currency.toUpperCase();
      const isNoDivision = NO_DIVISION_CURRENCIES.includes(upperCurrency);
      if (isNoDivision) {
        return parseInt(value, 10);
      }
      return Math.round(parseFloat(value) * 100);
    };
    getPayPalAccessToken = async () => {
      const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured");
      }
      const baseUrl = getPayPalBaseUrl();
      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "en_US",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
        },
        body: "grant_type=client_credentials"
      });
      const { access_token } = await response.json();
      if (!access_token) {
        throw new Error("Failed to get PayPal access token");
      }
      return access_token;
    };
  }
});

// features/integrations/payment/manual.ts
var manual_exports = {};
__export(manual_exports, {
  capturePaymentFunction: () => capturePaymentFunction3,
  createPaymentFunction: () => createPaymentFunction3,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction3,
  getPaymentStatusFunction: () => getPaymentStatusFunction3,
  handleWebhookFunction: () => handleWebhookFunction3,
  refundPaymentFunction: () => refundPaymentFunction3
});
async function handleWebhookFunction3({ event, headers }) {
  return {
    isValid: true,
    event,
    type: event.type,
    resource: event.data
  };
}
async function createPaymentFunction3({ order, amount, currency }) {
  return {
    status: "pending",
    data: {
      status: "pending",
      amount,
      currency: currency.toLowerCase(),
      orderId: order?.id
    }
  };
}
async function capturePaymentFunction3({ paymentId, amount }) {
  return {
    status: "captured",
    amount,
    data: {
      status: "captured",
      amount,
      captured_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function refundPaymentFunction3({ paymentId, amount }) {
  return {
    status: "refunded",
    amount,
    data: {
      status: "refunded",
      amount,
      refunded_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function getPaymentStatusFunction3({ paymentId }) {
  return {
    status: "succeeded",
    data: {
      status: "succeeded"
    }
  };
}
async function generatePaymentLinkFunction3({ paymentId }) {
  return null;
}
var init_manual = __esm({
  "features/integrations/payment/manual.ts"() {
    "use strict";
  }
});

// features/integrations/payment/index.ts
var payment_exports = {};
__export(payment_exports, {
  paymentProviderAdapters: () => paymentProviderAdapters
});
var paymentProviderAdapters;
var init_payment = __esm({
  "features/integrations/payment/index.ts"() {
    "use strict";
    paymentProviderAdapters = {
      stripe: () => Promise.resolve().then(() => (init_stripe(), stripe_exports)),
      paypal: () => Promise.resolve().then(() => (init_paypal(), paypal_exports)),
      manual: () => Promise.resolve().then(() => (init_manual(), manual_exports))
    };
  }
});

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core42 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/models/User.ts
var import_core = require("@keystone-6/core");
var import_access = require("@keystone-6/core/access");
var import_fields2 = require("@keystone-6/core/fields");

// features/keystone/access.ts
function isSignedIn({ session }) {
  return Boolean(session);
}
var permissions = {
  canAccessDashboard: ({ session }) => !!session?.data?.role?.canAccessDashboard,
  canReadOrders: ({ session }) => !!session?.data?.role?.canReadOrders,
  canManageOrders: ({ session }) => !!session?.data?.role?.canManageOrders,
  canReadPayments: ({ session }) => !!session?.data?.role?.canReadPayments,
  canManagePayments: ({ session }) => !!session?.data?.role?.canManagePayments,
  canReadProducts: ({ session }) => !!session?.data?.role?.canReadProducts,
  canManageProducts: ({ session }) => !!session?.data?.role?.canManageProducts,
  canReadCart: ({ session }) => !!session?.data?.role?.canReadCart,
  canManageCart: ({ session }) => !!session?.data?.role?.canManageCart,
  canReadInventory: ({ session }) => !!session?.data?.role?.canReadInventory,
  canManageInventory: ({ session }) => !!session?.data?.role?.canManageInventory,
  canReadUsers: ({ session }) => !!session?.data?.role?.canReadUsers,
  canManageUsers: ({ session }) => !!session?.data?.role?.canManageUsers,
  canSeeOtherPeople: ({ session }) => !!session?.data?.role?.canSeeOtherPeople,
  canEditOtherPeople: ({ session }) => !!session?.data?.role?.canEditOtherPeople,
  canManagePeople: ({ session }) => !!session?.data?.role?.canManagePeople,
  canReadRoles: ({ session }) => !!session?.data?.role?.canReadRoles,
  canManageRoles: ({ session }) => !!session?.data?.role?.canManageRoles,
  canReadKitchen: ({ session }) => !!session?.data?.role?.canReadKitchen,
  canManageKitchen: ({ session }) => !!session?.data?.role?.canManageKitchen,
  canReadTables: ({ session }) => !!session?.data?.role?.canReadTables,
  canManageTables: ({ session }) => !!session?.data?.role?.canManageTables,
  canReadStaff: ({ session }) => !!session?.data?.role?.canReadStaff,
  canManageStaff: ({ session }) => !!session?.data?.role?.canManageStaff,
  canManageSettings: ({ session }) => !!session?.data?.role?.canManageSettings,
  canManageOnboarding: ({ session }) => !!session?.data?.role?.canManageOnboarding,
  canReadVendors: ({ session }) => !!session?.data?.role?.canReadVendors,
  canManageVendors: ({ session }) => !!session?.data?.role?.canManageVendors,
  canReadGiftCards: ({ session }) => !!session?.data?.role?.canReadGiftCards,
  canManageGiftCards: ({ session }) => !!session?.data?.role?.canManageGiftCards,
  canReadDiscounts: ({ session }) => !!session?.data?.role?.canReadDiscounts,
  canManageDiscounts: ({ session }) => !!session?.data?.role?.canManageDiscounts
};
var rules = {
  canManageOrders({ session }) {
    if (!isSignedIn({ session })) return false;
    if (permissions.canManageOrders({ session })) return true;
    return false;
  },
  canManagePayments({ session }) {
    if (!isSignedIn({ session })) return false;
    if (permissions.canManagePayments({ session })) return true;
    return false;
  },
  canReadPeople({ session }) {
    if (!session) return false;
    if (permissions.canSeeOtherPeople({ session })) return true;
    return { id: { equals: session.itemId } };
  },
  canUpdatePeople({ session }) {
    if (!session) return false;
    if (permissions.canEditOtherPeople({ session })) return true;
    return { id: { equals: session.itemId } };
  }
};

// features/keystone/models/trackingFields.ts
var import_fields = require("@keystone-6/core/fields");
var trackingFields = {
  createdAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/models/User.ts
var User = (0, import_core.list)({
  access: {
    operation: {
      query: isSignedIn,
      // Any signed-in user can query (filter limits to self)
      create: () => true,
      update: isSignedIn,
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ["name", "email", "role", "employeeId", "staffRole", "isActive"]
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return "edit";
        if (session?.itemId === item?.id) return "edit";
        return "read";
      }
    }
  },
  fields: {
    name: (0, import_fields2.text)({
      validation: {
        isRequired: true
      }
    }),
    email: (0, import_fields2.text)({
      isFilterable: false,
      isOrderable: false,
      isIndexed: "unique",
      validation: {
        isRequired: true
      }
    }),
    password: (0, import_fields2.password)({
      access: {
        read: import_access.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      validation: { isRequired: true }
    }),
    role: (0, import_fields2.relationship)({
      ref: "Role.assignedTo",
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople
      },
      ui: {
        itemView: {
          fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read"
        }
      }
    }),
    apiKeys: (0, import_fields2.relationship)({
      ref: "ApiKey.user",
      many: true,
      ui: {
        itemView: { fieldMode: "read" }
      }
    }),
    phone: (0, import_fields2.text)({
      ui: {
        description: "Primary phone number for the user"
      }
    }),
    restaurantOrders: (0, import_fields2.relationship)({
      ref: "RestaurantOrder.customer",
      many: true,
      ui: {
        itemView: { fieldMode: "read" }
      }
    }),
    addresses: (0, import_fields2.relationship)({
      ref: "Address.user",
      many: true
    }),
    carts: (0, import_fields2.relationship)({
      ref: "Cart.user",
      many: true
    }),
    firstName: (0, import_fields2.virtual)({
      field: import_core.graphql.field({
        type: import_core.graphql.String,
        resolve(item) {
          const name = item.name || "";
          if (!name) return "";
          return name.trim().split(/\s+/)[0] || "";
        }
      })
    }),
    lastName: (0, import_fields2.virtual)({
      field: import_core.graphql.field({
        type: import_core.graphql.String,
        resolve(item) {
          const name = item.name || "";
          if (!name) return "";
          const parts = name.trim().split(/\s+/);
          return parts.length > 1 ? parts.slice(1).join(" ") : "";
        }
      })
    }),
    billingAddress: (0, import_fields2.virtual)({
      field: (lists) => import_core.graphql.field({
        type: lists.Address.types.output,
        async resolve(item, args, context) {
          const address = await context.db.Address.findMany({
            where: {
              user: { id: { equals: item.id } },
              isBilling: { equals: true }
            },
            take: 1
          });
          if (!address.length) return null;
          return address[0];
        }
      }),
      ui: {
        query: "{ id name address1 address2 city state postalCode phone isBilling }"
      }
    }),
    // Restaurant Staff Fields
    employeeId: (0, import_fields2.text)({
      db: { isNullable: true },
      ui: {
        description: "Unique employee identifier (staff only)"
      }
    }),
    staffRole: (0, import_fields2.select)({
      type: "string",
      options: [
        { label: "Server", value: "server" },
        { label: "Bartender", value: "bartender" },
        { label: "Host", value: "host" },
        { label: "Cook", value: "cook" },
        { label: "Manager", value: "manager" },
        { label: "Admin", value: "admin" },
        { label: "Busser", value: "busser" },
        { label: "Chef", value: "chef" }
      ],
      ui: {
        displayMode: "select",
        description: "Staff role in the restaurant"
      }
    }),
    hireDate: (0, import_fields2.timestamp)({
      ui: {
        description: "Date employee was hired"
      }
    }),
    hourlyRate: (0, import_fields2.decimal)({
      precision: 10,
      scale: 2,
      ui: {
        description: "Hourly wage rate"
      }
    }),
    pin: (0, import_fields2.text)({
      access: {
        read: import_access.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      ui: {
        description: "4-digit PIN for quick POS login"
      }
    }),
    staffPermissions: (0, import_fields2.json)({
      ui: {
        description: "Additional staff permissions and settings"
      }
    }),
    isActive: (0, import_fields2.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this employee is currently active"
      }
    }),
    onboardingStatus: (0, import_fields2.select)({
      type: "string",
      options: [
        { label: "Not Started", value: "not_started" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Dismissed", value: "dismissed" }
      ],
      defaultValue: "not_started",
      ui: {
        description: "Restaurant onboarding progress"
      }
    }),
    photo: (0, import_fields2.image)({
      storage: "my_images"
    }),
    // Emergency Contact Info
    emergencyContactName: (0, import_fields2.text)({
      ui: {
        description: "Emergency contact person name"
      }
    }),
    emergencyContactPhone: (0, import_fields2.text)({
      ui: {
        description: "Emergency contact phone number"
      }
    }),
    // Certifications
    certifications: (0, import_fields2.json)({
      ui: {
        description: "Food handler, alcohol service, and other certifications (JSON)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Role.ts
var import_core2 = require("@keystone-6/core");
var import_access3 = require("@keystone-6/core/access");
var import_fields3 = require("@keystone-6/core/fields");
var Role = (0, import_core2.list)({
  access: {
    operation: {
      ...(0, import_access3.allOperations)(permissions.canManageRoles),
      query: () => true
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: {
      initialColumns: ["name", "assignedTo"]
    },
    itemView: {
      defaultFieldMode: (args) => permissions.canManageRoles(args) ? "edit" : "read"
    }
  },
  fields: {
    name: (0, import_fields3.text)({ validation: { isRequired: true } }),
    // Dashboard
    canAccessDashboard: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Orders
    canReadOrders: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageOrders: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Payments
    canReadPayments: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManagePayments: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Products / Menu
    canReadProducts: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageProducts: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Cart
    canReadCart: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageCart: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Inventory
    canReadInventory: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageInventory: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Users
    canReadUsers: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageUsers: (0, import_fields3.checkbox)({ defaultValue: false }),
    canSeeOtherPeople: (0, import_fields3.checkbox)({ defaultValue: false }),
    canEditOtherPeople: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManagePeople: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Roles
    canReadRoles: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageRoles: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Kitchen
    canReadKitchen: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageKitchen: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Tables / Seating / Reservations
    canReadTables: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageTables: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Staff / Scheduling
    canReadStaff: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageStaff: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Settings
    canManageSettings: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Onboarding
    canManageOnboarding: (0, import_fields3.checkbox)({ defaultValue: true }),
    // Vendors
    canReadVendors: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageVendors: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Gift Cards
    canReadGiftCards: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageGiftCards: (0, import_fields3.checkbox)({ defaultValue: false }),
    // Discounts
    canReadDiscounts: (0, import_fields3.checkbox)({ defaultValue: false }),
    canManageDiscounts: (0, import_fields3.checkbox)({ defaultValue: false }),
    assignedTo: (0, import_fields3.relationship)({
      ref: "User.role",
      many: true,
      ui: {
        itemView: { fieldMode: "read" }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Section.ts
var import_core3 = require("@keystone-6/core");
var import_fields4 = require("@keystone-6/core/fields");
var Section = (0, import_core3.list)({
  access: {
    operation: {
      query: permissions.canReadTables,
      create: permissions.canManageTables,
      update: permissions.canManageTables,
      delete: permissions.canManageTables
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "tables"]
    }
  },
  fields: {
    name: (0, import_fields4.text)({
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    // Relationships
    tables: (0, import_fields4.relationship)({
      ref: "Table.section",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["tableNumber", "capacity", "status"],
        inlineCreate: { fields: ["tableNumber", "capacity", "status"] },
        inlineEdit: { fields: ["tableNumber", "capacity", "status"] }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Floor.ts
var import_core4 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");
var Floor = (0, import_core4.list)({
  access: {
    operation: {
      query: permissions.canReadTables,
      create: permissions.canManageTables,
      update: permissions.canManageTables,
      delete: permissions.canManageTables
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "level", "isActive"]
    }
  },
  fields: {
    name: (0, import_fields5.text)({
      validation: { isRequired: true },
      ui: {
        description: "Floor name (e.g., Main Floor, Second Floor, Patio)"
      }
    }),
    level: (0, import_fields5.integer)({
      validation: { isRequired: true },
      defaultValue: 1,
      ui: {
        description: "Floor level number (1 for ground floor, 2 for second floor, etc.)"
      }
    }),
    isActive: (0, import_fields5.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this floor is currently active for seating"
      }
    }),
    // Relationships
    tables: (0, import_fields5.relationship)({
      ref: "Table.floor",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["tableNumber", "capacity", "status"],
        inlineCreate: { fields: ["tableNumber", "capacity", "positionX", "positionY"] },
        inlineEdit: { fields: ["tableNumber", "capacity", "status", "positionX", "positionY"] }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Table.ts
var import_core5 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");
var Table = (0, import_core5.list)({
  access: {
    operation: {
      query: permissions.canReadTables,
      create: permissions.canManageTables,
      update: permissions.canManageTables,
      delete: permissions.canManageTables
    }
  },
  ui: {
    listView: {
      initialColumns: ["tableNumber", "capacity", "section", "status"]
    }
  },
  fields: {
    tableNumber: (0, import_fields6.text)({
      validation: { isRequired: true },
      isIndexed: true
    }),
    capacity: (0, import_fields6.integer)({
      validation: { isRequired: true, min: 1 },
      defaultValue: 4
    }),
    status: (0, import_fields6.select)({
      type: "string",
      options: [
        { label: "Available", value: "available" },
        { label: "Occupied", value: "occupied" },
        { label: "Reserved", value: "reserved" },
        { label: "Cleaning", value: "cleaning" }
      ],
      defaultValue: "available",
      ui: {
        displayMode: "segmented-control"
      }
    }),
    shape: (0, import_fields6.select)({
      type: "string",
      options: [
        { label: "Round", value: "round" },
        { label: "Square", value: "square" },
        { label: "Rectangle", value: "rectangle" }
      ],
      defaultValue: "rectangle",
      ui: {
        description: "Table shape for floor plan rendering"
      }
    }),
    // Floor plan positioning
    positionX: (0, import_fields6.float)({
      defaultValue: 0,
      ui: {
        description: "X coordinate for floor plan rendering"
      }
    }),
    positionY: (0, import_fields6.float)({
      defaultValue: 0,
      ui: {
        description: "Y coordinate for floor plan rendering"
      }
    }),
    metadata: (0, import_fields6.json)({
      ui: {
        description: "Additional table metadata (dimensions, notes, etc.)"
      }
    }),
    // Relationships
    floor: (0, import_fields6.relationship)({
      ref: "Floor.tables",
      ui: {
        displayMode: "select",
        description: "Floor this table belongs to"
      }
    }),
    section: (0, import_fields6.relationship)({
      ref: "Section.tables",
      ui: {
        displayMode: "select"
      }
    }),
    orders: (0, import_fields6.relationship)({
      ref: "RestaurantOrder.tables",
      many: true,
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" }
      }
    }),
    turnoverRate: (0, import_fields6.virtual)({
      field: import_core5.graphql.field({
        type: import_core5.graphql.Float,
        async resolve(item, args, context) {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
          const ordersCount = await context.sudo().query.RestaurantOrder.count({
            where: {
              tables: { some: { id: { equals: item.id } } },
              createdAt: { gte: dayAgo.toISOString() },
              status: { equals: "completed" }
            }
          });
          return ordersCount;
        }
      }),
      ui: {
        description: "Number of completed orders in the last 24 hours"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MenuCategory.ts
var import_core6 = require("@keystone-6/core");
var import_fields7 = require("@keystone-6/core/fields");
var MenuCategory = (0, import_core6.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: permissions.canManageProducts,
      update: permissions.canManageProducts,
      delete: permissions.canManageProducts
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "icon", "mealPeriods", "sortOrder"]
    }
  },
  fields: {
    name: (0, import_fields7.text)({
      validation: { isRequired: true }
    }),
    icon: (0, import_fields7.text)({
      ui: {
        description: "Icon name for this category (optional)"
      }
    }),
    description: (0, import_fields7.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    mealPeriods: (0, import_fields7.multiselect)({
      type: "string",
      options: [
        { label: "Breakfast", value: "breakfast" },
        { label: "Lunch", value: "lunch" },
        { label: "Dinner", value: "dinner" },
        { label: "All Day", value: "all_day" }
      ],
      defaultValue: ["all_day"]
    }),
    sortOrder: (0, import_fields7.integer)({
      defaultValue: 0,
      ui: {
        description: "Order in which categories appear on the menu"
      }
    }),
    // Relationships
    menuItems: (0, import_fields7.relationship)({
      ref: "MenuItem.category",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "price", "available"],
        inlineCreate: { fields: ["name", "price", "available"] },
        inlineEdit: { fields: ["name", "price", "available"] }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MenuItem.ts
var import_core7 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");
var import_fields_document = require("@keystone-6/fields-document");
var MenuItem = (0, import_core7.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: permissions.canManageProducts,
      update: permissions.canManageProducts,
      delete: permissions.canManageProducts
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "price", "category", "available", "kitchenStation"]
    }
  },
  fields: {
    name: (0, import_fields8.text)({
      validation: { isRequired: true }
    }),
    thumbnail: (0, import_fields8.virtual)({
      field: import_core7.graphql.field({
        type: import_core7.graphql.String,
        resolve: async (item, args, context) => {
          const menuItem = await context.query.MenuItem.findOne({
            where: { id: String(item.id) },
            query: "menuItemImages(take: 1) { image { url } imagePath }"
          });
          const imageUrl = menuItem?.menuItemImages?.[0]?.image?.url;
          if (imageUrl) {
            return imageUrl;
          }
          const imagePath = menuItem?.menuItemImages?.[0]?.imagePath;
          if (!imagePath) {
            return null;
          }
          if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:") || imagePath.startsWith("blob:") || imagePath.startsWith("/images/")) {
            return imagePath;
          }
          return imagePath.startsWith("/") ? `/images${imagePath}` : `/images/${imagePath}`;
        }
      })
    }),
    menuItemImages: (0, import_fields8.relationship)({
      ref: "MenuItemImage.menuItems",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["image", "altText", "imagePath"],
        inlineCreate: { fields: ["image", "altText", "imagePath"] },
        inlineEdit: { fields: ["image", "altText", "imagePath"] },
        inlineConnect: true,
        removeMode: "disconnect",
        linkToItem: false
      }
    }),
    description: (0, import_fields_document.document)({
      formatting: true,
      links: true
    }),
    price: (0, import_fields8.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Price in cents"
      }
    }),
    available: (0, import_fields8.checkbox)({
      defaultValue: true
    }),
    featured: (0, import_fields8.checkbox)({
      defaultValue: false,
      ui: {
        description: "Highlight this item on the storefront"
      }
    }),
    popular: (0, import_fields8.checkbox)({
      defaultValue: false,
      ui: {
        description: "Mark as popular item (shows 'Popular' badge)"
      }
    }),
    prepTime: (0, import_fields8.integer)({
      defaultValue: 15,
      ui: {
        description: "Preparation time in minutes"
      }
    }),
    calories: (0, import_fields8.integer)({
      ui: {
        description: "Calorie count for this menu item"
      }
    }),
    kitchenStation: (0, import_fields8.select)({
      type: "string",
      options: [
        { label: "Grill", value: "grill" },
        { label: "Fryer", value: "fryer" },
        { label: "Salad", value: "salad" },
        { label: "Dessert", value: "dessert" },
        { label: "Bar", value: "bar" },
        { label: "Expo", value: "expo" }
      ],
      defaultValue: "grill"
    }),
    allergens: (0, import_fields8.multiselect)({
      type: "string",
      options: [
        { label: "Gluten", value: "gluten" },
        { label: "Dairy", value: "dairy" },
        { label: "Eggs", value: "eggs" },
        { label: "Nuts", value: "nuts" },
        { label: "Shellfish", value: "shellfish" },
        { label: "Soy", value: "soy" },
        { label: "Fish", value: "fish" }
      ],
      defaultValue: []
    }),
    dietaryFlags: (0, import_fields8.multiselect)({
      type: "string",
      options: [
        { label: "Vegan", value: "vegan" },
        { label: "Vegetarian", value: "vegetarian" },
        { label: "Gluten-Free", value: "gluten_free" },
        { label: "Dairy-Free", value: "dairy_free" },
        { label: "Keto", value: "keto" }
      ],
      defaultValue: []
    }),
    mealPeriods: (0, import_fields8.multiselect)({
      type: "string",
      options: [
        { label: "Breakfast", value: "breakfast" },
        { label: "Lunch", value: "lunch" },
        { label: "Dinner", value: "dinner" },
        { label: "All Day", value: "all_day" }
      ],
      defaultValue: ["all_day"]
    }),
    // Relationships
    category: (0, import_fields8.relationship)({
      ref: "MenuCategory.menuItems",
      ui: {
        displayMode: "select"
      }
    }),
    modifiers: (0, import_fields8.relationship)({
      ref: "MenuItemModifier.menuItem",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "priceAdjustment", "modifierGroup"],
        inlineCreate: { fields: ["name", "priceAdjustment", "modifierGroup"] },
        inlineEdit: { fields: ["name", "priceAdjustment", "modifierGroup"] }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MenuItemImage.ts
var import_core8 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");
var MenuItemImage = (0, import_core8.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: permissions.canManageProducts,
      update: permissions.canManageProducts,
      delete: permissions.canManageProducts
    }
  },
  fields: {
    image: (0, import_fields9.image)({ storage: "my_images" }),
    imagePath: (0, import_fields9.text)(),
    altText: (0, import_fields9.text)(),
    order: (0, import_fields9.integer)({
      defaultValue: 0
    }),
    menuItems: (0, import_fields9.relationship)({ ref: "MenuItem.menuItemImages", many: true }),
    metadata: (0, import_fields9.json)(),
    ...trackingFields
  },
  ui: {
    listView: {
      initialColumns: ["image", "imagePath", "altText", "menuItems"]
    }
  }
});

// features/keystone/models/MenuItemModifier.ts
var import_core9 = require("@keystone-6/core");
var import_fields10 = require("@keystone-6/core/fields");
var MenuItemModifier = (0, import_core9.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: permissions.canManageProducts,
      update: permissions.canManageProducts,
      delete: permissions.canManageProducts
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "modifierGroup", "priceAdjustment", "defaultSelected"]
    }
  },
  fields: {
    name: (0, import_fields10.text)({
      validation: { isRequired: true }
    }),
    modifierGroup: (0, import_fields10.select)({
      type: "string",
      options: [
        { label: "Size", value: "size" },
        { label: "Temperature", value: "temperature" },
        { label: "Add-ons", value: "addons" },
        { label: "Removals", value: "removals" },
        { label: "Sides", value: "sides" },
        { label: "Dressings", value: "dressings" },
        { label: "Cheese", value: "cheese" },
        { label: "Toppings", value: "toppings" },
        { label: "Sauces", value: "sauces" },
        { label: "Patty", value: "patty" },
        { label: "Ice", value: "ice" },
        { label: "Dipping", value: "dipping" }
      ],
      defaultValue: "addons"
    }),
    modifierGroupLabel: (0, import_fields10.text)({
      ui: {
        description: "Display name for this modifier group (e.g. 'Choose Your Patty')"
      }
    }),
    required: (0, import_fields10.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether a selection from this group is required"
      }
    }),
    minSelections: (0, import_fields10.integer)({
      defaultValue: 0,
      ui: {
        description: "Minimum number of selections required"
      }
    }),
    maxSelections: (0, import_fields10.integer)({
      defaultValue: 1,
      ui: {
        description: "Maximum number of selections allowed"
      }
    }),
    priceAdjustment: (0, import_fields10.integer)({
      defaultValue: 0,
      ui: {
        description: "Price adjustment in cents (can be negative for removals like no-cheese)"
      }
    }),
    calories: (0, import_fields10.integer)({
      ui: {
        description: "Calorie count for this modifier"
      }
    }),
    defaultSelected: (0, import_fields10.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this modifier is selected by default"
      }
    }),
    // Relationships
    menuItem: (0, import_fields10.relationship)({
      ref: "MenuItem.modifiers",
      ui: {
        displayMode: "select"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/RestaurantOrder.ts
var import_core10 = require("@keystone-6/core");
var import_fields11 = require("@keystone-6/core/fields");
var import_crypto = __toESM(require("crypto"));

// features/keystone/utils/kitchenTicketSync.ts
var ACTIVE_ORDER_STATUSES = ["sent_to_kitchen", "in_progress", "ready"];
var ACTIVE_TICKET_STATUSES = ["new", "in_progress", "ready"];
function normalizeStationName(name) {
  return name.trim().toLowerCase();
}
function displayStationName(value) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function isExpediterStation(stationName) {
  const n = (stationName || "").toLowerCase();
  return n.includes("expo") || n.includes("expediter");
}
function isKitchenActiveOrderStatus(status) {
  return ACTIVE_ORDER_STATUSES.includes(status || "");
}
function getTicketStatusForOrderStatus(orderStatus) {
  if (orderStatus === "ready") return "ready";
  if (orderStatus === "in_progress") return "in_progress";
  return "new";
}
async function getOrCreateStation(stationKey, context, cachedStations) {
  const normalized = normalizeStationName(stationKey);
  const existing = cachedStations.find((s) => normalizeStationName(s.name) === normalized);
  if (existing) return existing;
  const created = await context.sudo().db.KitchenStation.createOne({
    data: {
      name: displayStationName(stationKey),
      isActive: true,
      displayOrder: cachedStations.length
    }
  });
  const createdStation = {
    id: created.id,
    name: displayStationName(stationKey),
    displayOrder: cachedStations.length
  };
  cachedStations.push(createdStation);
  return createdStation;
}
function mapOrderItemsByStation(order) {
  const grouped = {};
  for (const item of order.orderItems || []) {
    if (!item?.id) continue;
    const station = item.menuItem?.kitchenStation || "expo";
    if (!grouped[station]) grouped[station] = [];
    grouped[station].push({
      id: item.id,
      name: item.menuItem?.name || "Item",
      quantity: item.quantity || 1,
      notes: item.specialInstructions || null,
      station,
      status: "new",
      fulfilledAt: null
    });
  }
  return grouped;
}
async function reconcileRestaurantOrderStatus(orderId, context) {
  const sudo = context.sudo();
  const [order, tickets] = await Promise.all([
    sudo.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: "id status"
    }),
    sudo.query.KitchenTicket.findMany({
      where: { order: { id: { equals: orderId } } },
      query: "id status"
    })
  ]);
  if (!order || !tickets.length) return;
  const hasNew = tickets.some((t) => t.status === "new");
  const hasInProgress = tickets.some((t) => t.status === "in_progress");
  const hasReady = tickets.some((t) => t.status === "ready");
  const hasServed = tickets.some((t) => t.status === "served");
  const allServed = tickets.every((t) => ["served", "cancelled"].includes(t.status));
  let nextStatus = null;
  if (hasInProgress) nextStatus = "in_progress";
  else if (hasReady && !hasNew) nextStatus = "ready";
  else if (hasReady || hasNew) nextStatus = "sent_to_kitchen";
  else if (allServed || hasServed) nextStatus = "served";
  if (nextStatus && nextStatus !== order.status) {
    await sudo.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: { status: nextStatus }
    });
  }
}
async function syncKitchenTicketsForOrder(orderId, context) {
  const sudo = context.sudo();
  const order = await sudo.query.RestaurantOrder.findOne({
    where: { id: orderId },
    query: `
      id
      status
      isUrgent
      onHold
      createdAt
      orderItems {
        id
        quantity
        specialInstructions
        menuItem { id name kitchenStation }
      }
    `
  });
  if (!order) {
    return { created: 0, updated: 0, removed: 0 };
  }
  const existingTickets = await sudo.query.KitchenTicket.findMany({
    where: {
      order: { id: { equals: order.id } },
      status: { in: [...ACTIVE_TICKET_STATUSES, "served", "cancelled"] }
    },
    query: "id items status firedAt station { id name }",
    orderBy: { firedAt: "asc" }
  });
  if (order.status === "completed" || order.status === "cancelled") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let updated2 = 0;
    for (const ticket of existingTickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status))) {
      await sudo.db.KitchenTicket.updateOne({
        where: { id: ticket.id },
        data: {
          status: order.status === "completed" ? "served" : "cancelled",
          completedAt: order.status === "completed" ? now : void 0,
          servedAt: order.status === "completed" ? now : void 0
        }
      });
      updated2 += 1;
    }
    return { created: 0, updated: updated2, removed: 0 };
  }
  if (!isKitchenActiveOrderStatus(order.status)) {
    return { created: 0, updated: 0, removed: 0 };
  }
  const stations = await sudo.query.KitchenStation.findMany({
    query: "id name displayOrder",
    where: { isActive: { equals: true } },
    orderBy: { displayOrder: "asc" }
  });
  const stationItemMap = mapOrderItemsByStation(order);
  let created = 0;
  let updated = 0;
  let removed = 0;
  const desiredStationKeys = new Set(Object.keys(stationItemMap).map(normalizeStationName));
  if (desiredStationKeys.size === 0) {
    for (const ticket of existingTickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status))) {
      await sudo.db.KitchenTicket.deleteOne({ where: { id: ticket.id } });
      removed += 1;
    }
    return { created, updated, removed };
  }
  for (const [stationKey, items] of Object.entries(stationItemMap)) {
    const station = await getOrCreateStation(stationKey, context, stations);
    const matchingTickets = existingTickets.filter(
      (ticket) => normalizeStationName(ticket.station?.name || "") === normalizeStationName(station.name)
    );
    const priority = order.isUrgent ? 100 : order.onHold ? -10 : 0;
    const ticketType = isExpediterStation(station.name) ? "expediter" : "prep";
    if (matchingTickets.length > 0) {
      const existing = matchingTickets[0];
      const existingItems = existing.items || [];
      const existingMap = new Map(existingItems.map((i) => [i.id, i]));
      const mergedItems = items.map((item) => {
        const prev = existingMap.get(item.id);
        if (!prev) return item;
        return {
          ...item,
          status: prev.status || "new",
          fulfilledAt: prev.fulfilledAt || null
        };
      });
      await sudo.db.KitchenTicket.updateOne({
        where: { id: existing.id },
        data: {
          items: mergedItems,
          priority,
          ticketType,
          firedAt: existing.firedAt || order.createdAt
        }
      });
      updated += 1;
      for (const duplicate of matchingTickets.slice(1)) {
        await sudo.db.KitchenTicket.deleteOne({ where: { id: duplicate.id } });
        removed += 1;
      }
    } else {
      await sudo.db.KitchenTicket.createOne({
        data: {
          order: { connect: { id: order.id } },
          station: { connect: { id: station.id } },
          items,
          priority,
          ticketType,
          status: getTicketStatusForOrderStatus(order.status),
          firedAt: order.createdAt
        }
      });
      created += 1;
    }
  }
  for (const ticket of existingTickets.filter((ticket2) => ACTIVE_TICKET_STATUSES.includes(ticket2.status))) {
    const stationName = normalizeStationName(ticket.station?.name || "");
    if (!desiredStationKeys.has(stationName)) {
      await sudo.db.KitchenTicket.deleteOne({ where: { id: ticket.id } });
      removed += 1;
    }
  }
  await reconcileRestaurantOrderStatus(order.id, context);
  return { created, updated, removed };
}
async function syncKitchenTicketsForActiveOrders(context) {
  const orders = await context.sudo().query.RestaurantOrder.findMany({
    where: {
      status: { in: [...ACTIVE_ORDER_STATUSES] }
    },
    orderBy: { createdAt: "asc" },
    query: "id"
  });
  let created = 0;
  let updated = 0;
  let removed = 0;
  for (const order of orders) {
    const result = await syncKitchenTicketsForOrder(order.id, context);
    created += result.created;
    updated += result.updated;
    removed += result.removed;
  }
  return { created, updated, removed };
}

// features/keystone/models/RestaurantOrder.ts
var RestaurantOrder = (0, import_core10.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadOrders({ session }) || permissions.canManageOrders({ session }),
      create: permissions.canManageOrders,
      update: permissions.canManageOrders,
      delete: permissions.canManageOrders
    }
  },
  ui: {
    listView: {
      initialColumns: ["orderNumber", "orderType", "status", "tables", "server", "total"]
    }
  },
  hooks: {
    afterOperation: async ({ operation, item, originalItem, context }) => {
      const sudo = context.sudo();
      if (operation === "create" && item && item.orderType === "dine_in") {
        const orderWithTables = await sudo.query.RestaurantOrder.findOne({
          where: { id: item.id },
          query: "tables { id }"
        });
        if (orderWithTables?.tables?.length) {
          await Promise.all(orderWithTables.tables.map(
            (table) => sudo.db.Table.updateOne({ where: { id: table.id }, data: { status: "occupied" } })
          ));
        }
      }
      if (operation === "update" && item && item.orderType === "dine_in") {
        if (item.status === "completed" || item.status === "cancelled") {
          const orderWithTables = await sudo.query.RestaurantOrder.findOne({
            where: { id: item.id },
            query: "tables { id }"
          });
          if (orderWithTables?.tables?.length) {
            await Promise.all(orderWithTables.tables.map(
              (table) => sudo.db.Table.updateOne({ where: { id: table.id }, data: { status: "cleaning" } })
            ));
          }
        }
      }
      const previousStatus = originalItem?.status;
      const currentStatus = item?.status;
      const orderId = String(item?.id || "");
      const enteredKitchenFlow = operation === "create" ? isKitchenActiveOrderStatus(item?.status) : isKitchenActiveOrderStatus(currentStatus) && !isKitchenActiveOrderStatus(previousStatus);
      const leftKitchenFlow = operation === "update" && isKitchenActiveOrderStatus(previousStatus) && ["completed", "cancelled"].includes(currentStatus || "");
      if (orderId && (enteredKitchenFlow || leftKitchenFlow)) {
        try {
          await syncKitchenTicketsForOrder(orderId, context);
        } catch (err) {
          console.error("Kitchen ticket sync error:", err);
        }
      }
      if (operation === "update" && item?.status === "completed" && originalItem?.status !== "completed") {
        try {
          const orderItems = await sudo.query.OrderItem.findMany({
            where: { order: { id: { equals: item.id } } },
            query: "id quantity menuItem { id }"
          });
          for (const orderItem of orderItems) {
            if (!orderItem.menuItem?.id) continue;
            const recipes = await sudo.query.Recipe.findMany({
              where: { menuItem: { id: { equals: orderItem.menuItem.id } } },
              query: "id recipeIngredients yield"
            });
            if (recipes.length === 0) continue;
            const recipe = recipes[0];
            if (!recipe.recipeIngredients) continue;
            const recipeIngredients = recipe.recipeIngredients;
            const portionsOrdered = orderItem.quantity / (recipe.yield || 1);
            for (const ri of recipeIngredients) {
              if (!ri.ingredientId) continue;
              const depleteAmount = ri.quantity * portionsOrdered;
              const ingredient = await sudo.query.Ingredient.findOne({
                where: { id: ri.ingredientId },
                query: "id currentStock"
              });
              if (ingredient) {
                const newStock = Math.max(0, parseFloat(ingredient.currentStock || "0") - depleteAmount);
                await sudo.db.Ingredient.updateOne({
                  where: { id: ri.ingredientId },
                  data: { currentStock: newStock.toFixed(2) }
                });
                await sudo.db.StockMovement.createOne({
                  data: {
                    ingredient: { connect: { id: ri.ingredientId } },
                    type: "sale",
                    quantity: (-depleteAmount).toFixed(2),
                    notes: `Auto-depleted for order ${item.orderNumber}`
                  }
                });
              }
            }
          }
        } catch (err) {
          console.error("Auto-depletion error:", err);
        }
      }
    }
  },
  fields: {
    orderNumber: (0, import_fields11.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    orderType: (0, import_fields11.select)({
      type: "string",
      options: [
        { label: "Dine-in", value: "dine_in" },
        { label: "Takeout", value: "takeout" },
        { label: "Delivery", value: "delivery" }
      ],
      defaultValue: "dine_in"
    }),
    orderSource: (0, import_fields11.select)({
      type: "string",
      options: [
        { label: "POS", value: "pos" },
        { label: "Online", value: "online" },
        { label: "Kiosk", value: "kiosk" },
        { label: "Phone", value: "phone" }
      ],
      defaultValue: "pos"
    }),
    status: (0, import_fields11.select)({
      type: "string",
      options: [
        { label: "Open", value: "open" },
        { label: "Sent to Kitchen", value: "sent_to_kitchen" },
        { label: "In Progress", value: "in_progress" },
        { label: "Ready", value: "ready" },
        { label: "Served", value: "served" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "open"
    }),
    guestCount: (0, import_fields11.integer)({ defaultValue: 1, validation: { min: 1 } }),
    specialInstructions: (0, import_fields11.text)({ ui: { displayMode: "textarea" } }),
    onHold: (0, import_fields11.checkbox)({ defaultValue: false }),
    holdReason: (0, import_fields11.text)(),
    isUrgent: (0, import_fields11.checkbox)({ defaultValue: false }),
    subtotal: (0, import_fields11.integer)({ defaultValue: 0 }),
    tax: (0, import_fields11.integer)({ defaultValue: 0 }),
    tip: (0, import_fields11.integer)({ defaultValue: 0 }),
    discount: (0, import_fields11.integer)({ defaultValue: 0 }),
    total: (0, import_fields11.integer)({ defaultValue: 0 }),
    currencyCode: (0, import_fields11.text)({
      defaultValue: "USD",
      ui: { description: "ISO 4217 currency code at time of order" },
      hooks: {
        resolveInput: async ({ operation, inputData, context }) => {
          if (operation === "create" && !inputData.currencyCode) {
            const settings = await context.sudo().query.StoreSettings.findOne({
              where: { id: "1" },
              query: "currencyCode"
            });
            return settings?.currencyCode || "USD";
          }
          return inputData.currencyCode;
        }
      }
    }),
    // Customer Info
    customerName: (0, import_fields11.text)(),
    customerEmail: (0, import_fields11.text)(),
    customerPhone: (0, import_fields11.text)(),
    // Delivery Info
    deliveryAddress: (0, import_fields11.text)({ ui: { displayMode: "textarea" } }),
    deliveryAddress2: (0, import_fields11.text)(),
    deliveryCity: (0, import_fields11.text)(),
    deliveryState: (0, import_fields11.text)(),
    deliveryZip: (0, import_fields11.text)(),
    deliveryCountryCode: (0, import_fields11.text)(),
    secretKey: (0, import_fields11.text)({
      hooks: {
        resolveInput: ({ operation }) => {
          if (operation === "create") {
            return import_crypto.default.randomBytes(32).toString("hex");
          }
          return void 0;
        }
      }
    }),
    tableSeatedAt: (0, import_fields11.timestamp)({ defaultValue: { kind: "now" } }),
    tableFreedAt: (0, import_fields11.timestamp)(),
    tableDurationMinutes: (0, import_fields11.virtual)({
      field: import_core10.graphql.field({
        type: import_core10.graphql.Int,
        resolve(item) {
          if (!item.tableSeatedAt) return null;
          const end = item.tableFreedAt ? new Date(item.tableFreedAt) : /* @__PURE__ */ new Date();
          const start = new Date(item.tableSeatedAt);
          return Math.floor((end.getTime() - start.getTime()) / 6e4);
        }
      })
    }),
    courseCompletionPercentage: (0, import_fields11.virtual)({
      field: import_core10.graphql.field({
        type: import_core10.graphql.Int,
        async resolve(item, args, context) {
          const courses = await context.sudo().query.OrderCourse.findMany({
            where: { order: { id: { equals: item.id } } },
            query: "status"
          });
          if (courses.length === 0) return 0;
          return Math.round(courses.filter((c) => c.status === "served").length / courses.length * 100);
        }
      })
    }),
    tables: (0, import_fields11.relationship)({ ref: "Table.orders", many: true }),
    customer: (0, import_fields11.relationship)({ ref: "User.restaurantOrders" }),
    server: (0, import_fields11.relationship)({ ref: "User", ui: { labelField: "name" } }),
    createdBy: (0, import_fields11.relationship)({ ref: "User", ui: { labelField: "name" } }),
    courses: (0, import_fields11.relationship)({ ref: "OrderCourse.order", many: true }),
    orderItems: (0, import_fields11.relationship)({ ref: "OrderItem.order", many: true }),
    payments: (0, import_fields11.relationship)({ ref: "Payment.order", many: true }),
    discounts: (0, import_fields11.relationship)({ ref: "Discount.orders", many: true }),
    giftCards: (0, import_fields11.relationship)({ ref: "GiftCard.order", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/Address.ts
var import_core11 = require("@keystone-6/core");
var import_fields12 = require("@keystone-6/core/fields");
var Address = (0, import_core11.list)({
  access: {
    operation: {
      query: isSignedIn,
      create: isSignedIn,
      update: isSignedIn,
      delete: isSignedIn
    },
    filter: {
      query: ({ session }) => {
        if (permissions.canManagePeople({ session })) return true;
        return { user: { id: { equals: session?.itemId } } };
      },
      update: ({ session }) => {
        if (permissions.canManagePeople({ session })) return true;
        return { user: { id: { equals: session?.itemId } } };
      },
      delete: ({ session }) => {
        if (permissions.canManagePeople({ session })) return true;
        return { user: { id: { equals: session?.itemId } } };
      }
    }
  },
  fields: {
    label: (0, import_fields12.virtual)({
      field: import_core11.graphql.field({
        type: import_core11.graphql.String,
        resolve(item) {
          const parts = [];
          if (item.name) parts.push(item.name);
          if (item.address1) parts.push(item.address1);
          if (item.city) parts.push(item.city);
          return parts.join(", ");
        }
      })
    }),
    name: (0, import_fields12.text)({ validation: { isRequired: true } }),
    address1: (0, import_fields12.text)({ validation: { isRequired: true } }),
    address2: (0, import_fields12.text)(),
    city: (0, import_fields12.text)({ validation: { isRequired: true } }),
    state: (0, import_fields12.text)(),
    postalCode: (0, import_fields12.text)({ validation: { isRequired: true } }),
    countryCode: (0, import_fields12.text)({ defaultValue: "US" }),
    country: (0, import_fields12.text)(),
    phone: (0, import_fields12.text)(),
    isDefault: (0, import_fields12.checkbox)({ defaultValue: false }),
    isBilling: (0, import_fields12.checkbox)({ defaultValue: false }),
    metadata: (0, import_fields12.json)(),
    user: (0, import_fields12.relationship)({ ref: "User.addresses" }),
    ...trackingFields
  },
  ui: {
    labelField: "label",
    listView: {
      initialColumns: ["label", "user", "isDefault"]
    }
  }
});

// features/keystone/models/OrderItem.ts
var import_core12 = require("@keystone-6/core");
var import_fields13 = require("@keystone-6/core/fields");
var OrderItem = (0, import_core12.list)({
  hooks: {
    afterOperation: async ({ operation, item, originalItem, context }) => {
      const orderId = String(
        item?.orderId || item?.order?.id || originalItem?.orderId || originalItem?.order?.id || ""
      );
      if (!orderId) return;
      const order = await context.sudo().query.RestaurantOrder.findOne({
        where: { id: orderId },
        query: "id status"
      });
      if (!order || !isKitchenActiveOrderStatus(order.status)) return;
      try {
        await syncKitchenTicketsForOrder(order.id, context);
      } catch (err) {
        console.error(`Kitchen ticket sync error after order item ${operation}:`, err);
      }
    }
  },
  access: {
    operation: {
      query: permissions.canReadOrders,
      create: permissions.canManageOrders,
      update: permissions.canManageOrders,
      delete: permissions.canManageOrders
    }
  },
  ui: {
    listView: {
      initialColumns: ["menuItem", "quantity", "price", "order"]
    }
  },
  fields: {
    quantity: (0, import_fields13.integer)({
      defaultValue: 1,
      validation: { min: 1, isRequired: true }
    }),
    price: (0, import_fields13.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Price at time of order in cents (snapshot)"
      }
    }),
    unitPrice: (0, import_fields13.virtual)({
      field: import_core12.graphql.field({
        type: import_core12.graphql.Int,
        resolve(item) {
          return item.price || 0;
        }
      })
    }),
    totalPrice: (0, import_fields13.virtual)({
      field: import_core12.graphql.field({
        type: import_core12.graphql.Int,
        resolve(item) {
          return (item.price || 0) * (item.quantity || 1);
        }
      })
    }),
    thumbnail: (0, import_fields13.virtual)({
      field: import_core12.graphql.field({
        type: import_core12.graphql.String,
        async resolve(item, args, context) {
          const sudoContext = context.sudo();
          const orderItem = await sudoContext.query.OrderItem.findOne({
            where: { id: String(item.id) },
            query: `
              menuItem {
                thumbnail
              }
            `
          });
          return orderItem?.menuItem?.thumbnail || null;
        }
      })
    }),
    specialInstructions: (0, import_fields13.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    courseNumber: (0, import_fields13.integer)({
      defaultValue: 1,
      ui: {
        description: "For fine dining: 1=appetizer, 2=main, 3=dessert"
      }
    }),
    seatNumber: (0, import_fields13.integer)({
      ui: {
        description: "Seat number for split check support"
      }
    }),
    sentToKitchen: (0, import_fields13.timestamp)({
      ui: {
        description: "When this item was sent to kitchen"
      }
    }),
    kitchenStatus: (0, import_fields13.select)({
      type: "string",
      options: [
        { label: "New", value: "new" },
        { label: "In Progress", value: "in_progress" },
        { label: "Ready", value: "ready" },
        { label: "Fulfilled", value: "fulfilled" },
        { label: "Recalled", value: "recalled" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "new",
      ui: {
        description: "Kitchen lifecycle state for this item"
      }
    }),
    firedAt: (0, import_fields13.timestamp)({
      ui: {
        description: "When this item was fired to prep station"
      }
    }),
    kitchenStartedAt: (0, import_fields13.timestamp)({
      ui: {
        description: "When prep started"
      }
    }),
    kitchenReadyAt: (0, import_fields13.timestamp)({
      ui: {
        description: "When item was marked ready"
      }
    }),
    fulfilledAt: (0, import_fields13.timestamp)({
      ui: {
        description: "When item was fulfilled/served"
      }
    }),
    recalledAt: (0, import_fields13.timestamp)({
      ui: {
        description: "When item was recalled from ready state"
      }
    }),
    // Relationships
    order: (0, import_fields13.relationship)({
      ref: "RestaurantOrder.orderItems",
      ui: {
        displayMode: "select"
      }
    }),
    course: (0, import_fields13.relationship)({
      ref: "OrderCourse.orderItems",
      ui: {
        displayMode: "select"
      }
    }),
    menuItem: (0, import_fields13.relationship)({
      ref: "MenuItem",
      ui: {
        displayMode: "select"
      }
    }),
    // Applied modifiers for this order item
    appliedModifiers: (0, import_fields13.relationship)({
      ref: "MenuItemModifier",
      many: true,
      ui: {
        displayMode: "select"
      }
    }),
    kitchenTickets: (0, import_fields13.relationship)({
      ref: "KitchenTicket.orderItems",
      many: true,
      ui: {
        displayMode: "select",
        description: "Kitchen tickets this item has appeared on"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/OrderCourse.ts
var import_core13 = require("@keystone-6/core");
var import_fields14 = require("@keystone-6/core/fields");
var OrderCourse = (0, import_core13.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  ui: {
    listView: {
      initialColumns: ["order", "courseType", "status", "fireTime"]
    }
  },
  fields: {
    courseType: (0, import_fields14.select)({
      type: "string",
      options: [
        { label: "Appetizers", value: "appetizers" },
        { label: "Mains", value: "mains" },
        { label: "Desserts", value: "desserts" },
        { label: "Drinks", value: "drinks" }
      ],
      defaultValue: "mains",
      validation: { isRequired: true }
    }),
    status: (0, import_fields14.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Fired", value: "fired" },
        { label: "Ready", value: "ready" },
        { label: "Served", value: "served" }
      ],
      defaultValue: "pending"
    }),
    fireTime: (0, import_fields14.timestamp)({
      ui: {
        description: "When this course was sent to the kitchen"
      }
    }),
    autoFireAt: (0, import_fields14.timestamp)({
      ui: {
        description: "Scheduled time to auto-fire this course"
      }
    }),
    onHold: (0, import_fields14.checkbox)({ defaultValue: false }),
    allItemsReady: (0, import_fields14.checkbox)({
      defaultValue: false
    }),
    courseNumber: (0, import_fields14.integer)({
      defaultValue: 1
    }),
    // Relationships
    order: (0, import_fields14.relationship)({
      ref: "RestaurantOrder.courses",
      ui: {
        displayMode: "select"
      }
    }),
    orderItems: (0, import_fields14.relationship)({
      ref: "OrderItem.course",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/KitchenMessage.ts
var import_core14 = require("@keystone-6/core");
var import_fields15 = require("@keystone-6/core/fields");
var KitchenMessage = (0, import_core14.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  fields: {
    content: (0, import_fields15.text)({ validation: { isRequired: true } }),
    type: (0, import_fields15.select)({
      options: [
        { label: "General", value: "general" },
        { label: "Urgent", value: "urgent" },
        { label: "86 Alert", value: "86_alert" }
      ],
      defaultValue: "general"
    }),
    fromStation: (0, import_fields15.select)({
      options: [
        { label: "Kitchen", value: "kitchen" },
        { label: "FOH", value: "foh" }
      ],
      defaultValue: "foh"
    }),
    // Relationships
    order: (0, import_fields15.relationship)({ ref: "RestaurantOrder" }),
    sender: (0, import_fields15.relationship)({ ref: "User" }),
    ...trackingFields
  }
});

// features/keystone/models/Recipe.ts
var import_core15 = require("@keystone-6/core");
var import_fields16 = require("@keystone-6/core/fields");
var Recipe = (0, import_core15.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: permissions.canManageProducts,
      update: permissions.canManageProducts,
      delete: permissions.canManageProducts
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "menuItem", "yield", "totalCost"]
    },
    labelField: "name"
  },
  fields: {
    name: (0, import_fields16.text)({ validation: { isRequired: true } }),
    menuItem: (0, import_fields16.relationship)({
      ref: "MenuItem",
      many: false
    }),
    recipeIngredients: (0, import_fields16.json)({
      ui: {
        description: "Array of { ingredientId: string, quantity: number, unit: string }"
      }
    }),
    yield: (0, import_fields16.integer)({
      defaultValue: 1,
      ui: { description: "Number of servings this recipe produces" }
    }),
    prepTime: (0, import_fields16.integer)({
      ui: { description: "Preparation time in minutes" }
    }),
    instructions: (0, import_fields16.text)({
      ui: { displayMode: "textarea" }
    }),
    totalCost: (0, import_fields16.virtual)({
      field: import_core15.graphql.field({
        type: import_core15.graphql.Float,
        async resolve(item, args, context) {
          if (!item.recipeIngredients) return 0;
          const ingredients = item.recipeIngredients;
          let total = 0;
          for (const ri of ingredients) {
            if (!ri.ingredientId) continue;
            const ingredient = await context.sudo().query.Ingredient.findOne({
              where: { id: ri.ingredientId },
              query: "costPerUnit"
            });
            if (ingredient?.costPerUnit) {
              total += parseFloat(ingredient.costPerUnit) * (ri.quantity || 0);
            }
          }
          return total;
        }
      })
    }),
    costPerServing: (0, import_fields16.virtual)({
      field: import_core15.graphql.field({
        type: import_core15.graphql.Float,
        async resolve(item, args, context) {
          if (!item.recipeIngredients) return 0;
          const ingredients = item.recipeIngredients;
          let total = 0;
          for (const ri of ingredients) {
            if (!ri.ingredientId) continue;
            const ingredient = await context.sudo().query.Ingredient.findOne({
              where: { id: ri.ingredientId },
              query: "costPerUnit"
            });
            if (ingredient?.costPerUnit) {
              total += parseFloat(ingredient.costPerUnit) * (ri.quantity || 0);
            }
          }
          return total / (item.yield || 1);
        }
      })
    }),
    foodCostPercentage: (0, import_fields16.virtual)({
      field: import_core15.graphql.field({
        type: import_core15.graphql.Float,
        async resolve(item, args, context) {
          if (!item.menuItemId) return 0;
          const menuItem = await context.sudo().query.MenuItem.findOne({
            where: { id: item.menuItemId },
            query: "price"
          });
          if (!menuItem?.price || parseFloat(menuItem.price) === 0) return 0;
          if (!item.recipeIngredients) return 0;
          const ingredients = item.recipeIngredients;
          let total = 0;
          for (const ri of ingredients) {
            if (!ri.ingredientId) continue;
            const ingredient = await context.sudo().query.Ingredient.findOne({
              where: { id: ri.ingredientId },
              query: "costPerUnit"
            });
            if (ingredient?.costPerUnit) {
              total += parseFloat(ingredient.costPerUnit) * (ri.quantity || 0);
            }
          }
          const costPerServing = total / (item.yield || 1);
          return costPerServing / parseFloat(menuItem.price) * 100;
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/Reservation.ts
var import_core16 = require("@keystone-6/core");
var import_fields17 = require("@keystone-6/core/fields");
var Reservation = (0, import_core16.list)({
  access: {
    operation: {
      query: permissions.canReadTables,
      create: permissions.canManageTables,
      update: permissions.canManageTables,
      delete: permissions.canManageTables
    }
  },
  ui: {
    listView: {
      initialColumns: ["customerName", "reservationDate", "partySize", "status", "assignedTable"]
    }
  },
  fields: {
    customerName: (0, import_fields17.text)({
      validation: { isRequired: true }
    }),
    customerPhone: (0, import_fields17.text)({
      validation: { isRequired: true }
    }),
    customerEmail: (0, import_fields17.text)(),
    reservationDate: (0, import_fields17.timestamp)({
      validation: { isRequired: true }
    }),
    partySize: (0, import_fields17.integer)({
      validation: { isRequired: true, min: 1 },
      defaultValue: 2
    }),
    duration: (0, import_fields17.integer)({
      defaultValue: 90,
      ui: {
        description: "Expected duration in minutes"
      }
    }),
    status: (0, import_fields17.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Seated", value: "seated" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "No-show", value: "no_show" }
      ],
      defaultValue: "pending"
    }),
    specialRequests: (0, import_fields17.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    // Relationships
    assignedTable: (0, import_fields17.relationship)({
      ref: "Table",
      ui: {
        displayMode: "select"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Payment.ts
var import_core17 = require("@keystone-6/core");
var import_fields18 = require("@keystone-6/core/fields");
var Payment = (0, import_core17.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: permissions.canManagePayments,
      update: permissions.canManagePayments,
      delete: permissions.canManagePayments
    }
  },
  ui: {
    listView: {
      initialColumns: ["amount", "status", "paymentMethod", "order", "createdAt"]
    }
  },
  fields: {
    amount: (0, import_fields18.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Payment amount in cents"
      }
    }),
    data: (0, import_fields18.json)({
      ui: {
        description: "Payment provider data (clientSecret, paymentIntentId, orderId, etc.)"
      }
    }),
    currencyCode: (0, import_fields18.text)({
      defaultValue: "USD",
      ui: { description: "ISO 4217 currency code for this payment" },
      hooks: {
        resolveInput: async ({ operation, inputData, context }) => {
          if (operation === "create" && !inputData.currencyCode) {
            const settings = await context.sudo().query.StoreSettings.findOne({
              where: { id: "1" },
              query: "currencyCode"
            });
            return settings?.currencyCode || "USD";
          }
          return inputData.currencyCode;
        }
      }
    }),
    status: (0, import_fields18.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" },
        { label: "Partially Refunded", value: "partially_refunded" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    paymentMethod: (0, import_fields18.select)({
      type: "string",
      options: [
        { label: "Credit Card", value: "credit_card" },
        { label: "Debit Card", value: "debit_card" },
        { label: "Cash", value: "cash" },
        { label: "Gift Card", value: "gift_card" },
        { label: "PayPal", value: "paypal" },
        { label: "Apple Pay", value: "apple_pay" },
        { label: "Google Pay", value: "google_pay" }
      ],
      defaultValue: "credit_card"
    }),
    paymentProvider: (0, import_fields18.relationship)({
      ref: "PaymentProvider",
      ui: {
        displayMode: "select",
        description: "Optional provider backing this payment"
      }
    }),
    providerPaymentId: (0, import_fields18.text)({
      ui: {
        description: "Provider payment identifier (Stripe/PayPal/etc.)"
      }
    }),
    // Card details (last 4 digits for reference)
    cardLast4: (0, import_fields18.text)({
      ui: {
        description: "Last 4 digits of card"
      }
    }),
    cardBrand: (0, import_fields18.text)({
      ui: {
        description: "Card brand (visa, mastercard, etc.)"
      }
    }),
    // Tip handling
    tipAmount: (0, import_fields18.integer)({
      defaultValue: 0,
      ui: {
        description: "Tip amount included in payment in cents"
      }
    }),
    // Split payment support
    isSplitPayment: (0, import_fields18.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this payment is part of a split bill"
      }
    }),
    splitPaymentIndex: (0, import_fields18.integer)({
      ui: {
        description: "Index of this payment in split (1, 2, 3, etc.)"
      }
    }),
    splitTotal: (0, import_fields18.integer)({
      ui: {
        description: "Total number of split payments for this order"
      }
    }),
    processedAt: (0, import_fields18.timestamp)({
      ui: {
        description: "When payment was successfully processed"
      }
    }),
    // Metadata for errors or additional info
    errorMessage: (0, import_fields18.text)({
      ui: {
        description: "Error message if payment failed"
      }
    }),
    notes: (0, import_fields18.text)({
      ui: {
        displayMode: "textarea",
        description: "Internal notes about this payment"
      }
    }),
    // Relationships
    order: (0, import_fields18.relationship)({
      ref: "RestaurantOrder.payments",
      ui: {
        displayMode: "select"
      }
    }),
    paymentCollection: (0, import_fields18.relationship)({
      ref: "PaymentCollection.payments",
      ui: {
        displayMode: "select",
        description: "Payment collection this payment belongs to"
      }
    }),
    processedBy: (0, import_fields18.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed payment"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentCollection.ts
var import_core18 = require("@keystone-6/core");
var import_fields19 = require("@keystone-6/core/fields");
var PaymentCollection = (0, import_core18.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageOrders({ session }),
      create: ({ session }) => permissions.canManageOrders({ session }),
      update: ({ session }) => permissions.canManageOrders({ session }),
      delete: ({ session }) => permissions.canManageOrders({ session })
    }
  },
  fields: {
    description: (0, import_fields19.select)({
      type: "enum",
      options: [
        { label: "Default", value: "default" },
        { label: "Refund", value: "refund" }
      ],
      defaultValue: "default"
    }),
    amount: (0, import_fields19.integer)({
      validation: { isRequired: true }
    }),
    authorizedAmount: (0, import_fields19.integer)({
      defaultValue: 0
    }),
    refundedAmount: (0, import_fields19.integer)({
      defaultValue: 0
    }),
    metadata: (0, import_fields19.json)(),
    paymentSessions: (0, import_fields19.relationship)({
      ref: "PaymentSession.paymentCollection",
      many: true
    }),
    payments: (0, import_fields19.relationship)({
      ref: "Payment.paymentCollection",
      many: true
    }),
    cart: (0, import_fields19.relationship)({
      ref: "Cart.paymentCollection"
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentSession.ts
var import_core19 = require("@keystone-6/core");
var import_fields20 = require("@keystone-6/core/fields");
var PaymentSession = (0, import_core19.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageOrders({ session }),
      create: ({ session }) => permissions.canManageOrders({ session }),
      update: ({ session }) => permissions.canManageOrders({ session }),
      delete: ({ session }) => permissions.canManageOrders({ session })
    }
  },
  fields: {
    isSelected: (0, import_fields20.checkbox)({
      defaultValue: false
    }),
    isInitiated: (0, import_fields20.checkbox)({
      defaultValue: false
    }),
    amount: (0, import_fields20.integer)({
      validation: { isRequired: true }
    }),
    data: (0, import_fields20.json)({
      defaultValue: {}
    }),
    idempotencyKey: (0, import_fields20.text)({
      isIndexed: true
    }),
    paymentCollection: (0, import_fields20.relationship)({
      ref: "PaymentCollection.paymentSessions"
    }),
    paymentProvider: (0, import_fields20.relationship)({
      ref: "PaymentProvider.sessions",
      many: false
    }),
    paymentAuthorizedAt: (0, import_fields20.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/Cart.ts
var import_core20 = require("@keystone-6/core");
var import_fields21 = require("@keystone-6/core/fields");
var Cart = (0, import_core20.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageOrders({ session }) || permissions.canReadOrders({ session }),
      create: () => true,
      update: permissions.canManageOrders,
      delete: permissions.canManageOrders
    },
    filter: {
      query: ({ session }) => {
        if (!session) return false;
        if (permissions.canManageOrders({ session })) return true;
        return { user: { id: { equals: session.itemId } } };
      },
      update: ({ session }) => {
        if (!session) return false;
        if (permissions.canManageOrders({ session })) return true;
        return { user: { id: { equals: session.itemId } } };
      }
    }
  },
  fields: {
    user: (0, import_fields21.relationship)({ ref: "User.carts" }),
    items: (0, import_fields21.relationship)({ ref: "CartItem.cart", many: true }),
    orderType: (0, import_fields21.select)({
      options: [
        { label: "Pickup", value: "pickup" },
        { label: "Delivery", value: "delivery" }
      ],
      defaultValue: "pickup"
    }),
    email: (0, import_fields21.text)(),
    customerName: (0, import_fields21.text)(),
    customerPhone: (0, import_fields21.text)(),
    deliveryAddress: (0, import_fields21.text)(),
    deliveryAddress2: (0, import_fields21.text)(),
    deliveryCity: (0, import_fields21.text)(),
    deliveryState: (0, import_fields21.text)(),
    deliveryZip: (0, import_fields21.text)(),
    deliveryCountryCode: (0, import_fields21.text)(),
    paymentCollection: (0, import_fields21.relationship)({
      ref: "PaymentCollection.cart"
    }),
    tipPercent: (0, import_fields21.select)({
      options: [
        { label: "0%", value: "0" },
        { label: "15%", value: "15" },
        { label: "18%", value: "18" },
        { label: "20%", value: "20" },
        { label: "25%", value: "25" }
      ],
      defaultValue: "0"
    }),
    order: (0, import_fields21.relationship)({ ref: "RestaurantOrder" }),
    subtotal: (0, import_fields21.virtual)({
      field: import_core20.graphql.field({
        type: import_core20.graphql.Int,
        async resolve(item, args, context) {
          const cart = await context.sudo().query.Cart.findOne({
            where: { id: item.id },
            query: "items { quantity menuItem { price } modifiers { priceAdjustment } }"
          });
          if (!cart?.items) return 0;
          return cart.items.reduce((total, cartItem) => {
            const modifiersTotal = cartItem.modifiers?.reduce((sum, mod) => sum + (mod.priceAdjustment || 0), 0) || 0;
            return total + ((cartItem.menuItem?.price || 0) + modifiersTotal) * cartItem.quantity;
          }, 0);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/CartItem.ts
var import_core21 = require("@keystone-6/core");
var import_fields22 = require("@keystone-6/core/fields");
var CartItem = (0, import_core21.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: () => true,
      // Allow adding items for guests
      update: permissions.canManageCart,
      delete: permissions.canManageCart
    }
  },
  fields: {
    cart: (0, import_fields22.relationship)({ ref: "Cart.items" }),
    menuItem: (0, import_fields22.relationship)({ ref: "MenuItem" }),
    quantity: (0, import_fields22.integer)({ defaultValue: 1, validation: { min: 1 } }),
    modifiers: (0, import_fields22.relationship)({ ref: "MenuItemModifier", many: true }),
    specialInstructions: (0, import_fields22.text)(),
    thumbnail: (0, import_fields22.virtual)({
      field: import_core21.graphql.field({
        type: import_core21.graphql.String,
        async resolve(item, args, context) {
          const sudoContext = context.sudo();
          const cartItem = await sudoContext.query.CartItem.findOne({
            where: { id: String(item.id) },
            query: `
              menuItem {
                thumbnail
              }
            `
          });
          return cartItem?.menuItem?.thumbnail || null;
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentProvider.ts
var import_core22 = require("@keystone-6/core");
var import_fields23 = require("@keystone-6/core/fields");
var PaymentProvider = (0, import_core22.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: permissions.canManagePayments,
      update: permissions.canManagePayments,
      delete: permissions.canManagePayments
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "code", "isInstalled"]
    }
  },
  fields: {
    name: (0, import_fields23.text)({
      validation: { isRequired: true }
    }),
    code: (0, import_fields23.text)({
      isIndexed: "unique",
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-zA-Z0-9-_]+$/,
          explanation: 'Payment provider code must start with "pp_" followed by alphanumeric characters, hyphens or underscores'
        }
      }
    }),
    isInstalled: (0, import_fields23.checkbox)({
      defaultValue: true
    }),
    credentials: (0, import_fields23.json)({
      defaultValue: {}
    }),
    metadata: (0, import_fields23.json)({
      defaultValue: {}
    }),
    createPaymentFunction: (0, import_fields23.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to create payments"
      }
    }),
    capturePaymentFunction: (0, import_fields23.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to capture payments"
      }
    }),
    refundPaymentFunction: (0, import_fields23.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to refund payments"
      }
    }),
    getPaymentStatusFunction: (0, import_fields23.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to check payment status"
      }
    }),
    generatePaymentLinkFunction: (0, import_fields23.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to generate payment dashboard links"
      }
    }),
    handleWebhookFunction: (0, import_fields23.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to handle provider webhooks"
      }
    }),
    sessions: (0, import_fields23.relationship)({
      ref: "PaymentSession.paymentProvider",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/ApiKey.ts
var import_fields24 = require("@keystone-6/core/fields");
var import_core23 = require("@keystone-6/core");
var ApiKey = (0, import_core23.list)({
  access: {
    operation: {
      query: isSignedIn,
      create: isSignedIn,
      update: isSignedIn,
      delete: isSignedIn
    },
    filter: {
      query: ({ session }) => ({ user: { id: { equals: session?.itemId } } }),
      update: ({ session }) => ({ user: { id: { equals: session?.itemId } } }),
      delete: ({ session }) => ({ user: { id: { equals: session?.itemId } } })
    }
  },
  hooks: {
    validate: {
      create: async ({ resolvedData, addValidationError }) => {
        if (!resolvedData.scopes || resolvedData.scopes.length === 0) {
          addValidationError("At least one scope is required for API keys");
        }
      }
    },
    resolveInput: {
      create: async ({ resolvedData, context }) => {
        return {
          ...resolvedData,
          user: resolvedData.user || (context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0)
        };
      }
    }
  },
  fields: {
    name: (0, import_fields24.text)({
      validation: { isRequired: true },
      ui: {
        description: "A descriptive name for this API key (e.g. 'POS Integration')"
      }
    }),
    tokenSecret: (0, import_fields24.password)({
      validation: { isRequired: true },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" },
        description: "Secure API key token (hashed and never displayed)"
      }
    }),
    tokenPreview: (0, import_fields24.text)({
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        listView: { fieldMode: "read" },
        description: "Preview of the API key (actual key is hidden)"
      }
    }),
    scopes: (0, import_fields24.json)({
      defaultValue: [],
      ui: {
        description: "Array of scopes for this API key"
      }
    }),
    status: (0, import_fields24.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Revoked", value: "revoked" }
      ],
      defaultValue: "active",
      ui: {
        description: "Current status of this API key"
      }
    }),
    expiresAt: (0, import_fields24.timestamp)({
      ui: {
        description: "When this API key expires (optional - leave blank for no expiration)"
      }
    }),
    lastUsedAt: (0, import_fields24.timestamp)({
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Last time this API key was used"
      }
    }),
    usageCount: (0, import_fields24.json)({
      defaultValue: { total: 0, daily: {} },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Usage statistics for this API key"
      }
    }),
    restrictedToIPs: (0, import_fields24.json)({
      defaultValue: [],
      ui: {
        description: "Optional: Restrict this key to specific IP addresses (array of IPs)"
      }
    }),
    ...trackingFields,
    user: (0, import_fields24.relationship)({
      ref: "User.apiKeys",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" }
      }
    })
  },
  ui: {
    labelField: "name",
    listView: {
      initialColumns: ["name", "tokenPreview", "scopes", "status", "lastUsedAt"]
    },
    description: "Secure API keys for programmatic access"
  }
});

// features/keystone/models/Discount.ts
var import_core24 = require("@keystone-6/core");
var import_fields25 = require("@keystone-6/core/fields");
var Discount = (0, import_core24.list)({
  access: {
    operation: {
      query: permissions.canReadDiscounts,
      create: permissions.canManageDiscounts,
      update: permissions.canManageDiscounts,
      delete: isSignedIn
    }
  },
  ui: {
    listView: {
      initialColumns: ["code", "isDisabled", "usageCount", "startsAt"]
    }
  },
  fields: {
    code: (0, import_fields25.text)({
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    isDynamic: (0, import_fields25.checkbox)(),
    isDisabled: (0, import_fields25.checkbox)(),
    stackable: (0, import_fields25.checkbox)({
      defaultValue: false
    }),
    startsAt: (0, import_fields25.timestamp)({
      defaultValue: { kind: "now" },
      validation: { isRequired: true }
    }),
    endsAt: (0, import_fields25.timestamp)(),
    metadata: (0, import_fields25.json)(),
    usageLimit: (0, import_fields25.integer)(),
    usageCount: (0, import_fields25.integer)({
      defaultValue: 0,
      validation: { isRequired: true }
    }),
    validDuration: (0, import_fields25.text)(),
    ...trackingFields,
    discountRule: (0, import_fields25.relationship)({
      ref: "DiscountRule.discounts"
    }),
    orders: (0, import_fields25.relationship)({
      ref: "RestaurantOrder.discounts",
      many: true
    })
  }
});

// features/keystone/models/DiscountRule.ts
var import_core25 = require("@keystone-6/core");
var import_fields26 = require("@keystone-6/core/fields");
var DiscountRule = (0, import_core25.list)({
  access: {
    operation: {
      query: permissions.canReadDiscounts,
      create: permissions.canManageDiscounts,
      update: permissions.canManageDiscounts,
      delete: permissions.canManageDiscounts
    }
  },
  ui: {
    listView: {
      initialColumns: ["description", "type", "value"]
    }
  },
  fields: {
    description: (0, import_fields26.text)(),
    type: (0, import_fields26.select)({
      type: "enum",
      options: [
        { label: "Fixed", value: "fixed" },
        { label: "Percentage", value: "percentage" },
        { label: "Free Item", value: "free_item" }
      ],
      validation: { isRequired: true }
    }),
    value: (0, import_fields26.integer)({
      validation: { isRequired: true }
    }),
    allocation: (0, import_fields26.select)({
      type: "enum",
      options: [
        { label: "Total", value: "total" },
        { label: "Item", value: "item" }
      ]
    }),
    metadata: (0, import_fields26.json)(),
    discounts: (0, import_fields26.relationship)({
      ref: "Discount.discountRule",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/GiftCard.ts
var import_core26 = require("@keystone-6/core");
var import_fields27 = require("@keystone-6/core/fields");
var GiftCard = (0, import_core26.list)({
  access: {
    operation: {
      query: permissions.canReadGiftCards,
      create: permissions.canManageGiftCards,
      update: permissions.canManageGiftCards,
      delete: permissions.canManageGiftCards
    }
  },
  ui: {
    listView: {
      initialColumns: ["code", "value", "balance", "isDisabled"]
    }
  },
  fields: {
    code: (0, import_fields27.text)({
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    value: (0, import_fields27.integer)({
      validation: { isRequired: true }
    }),
    balance: (0, import_fields27.integer)({
      validation: { isRequired: true }
    }),
    isDisabled: (0, import_fields27.checkbox)(),
    endsAt: (0, import_fields27.timestamp)(),
    metadata: (0, import_fields27.json)(),
    ...trackingFields,
    order: (0, import_fields27.relationship)({
      ref: "RestaurantOrder.giftCards"
    }),
    giftCardTransactions: (0, import_fields27.relationship)({
      ref: "GiftCardTransaction.giftCard",
      many: true
    })
  }
});

// features/keystone/models/GiftCardTransaction.ts
var import_core27 = require("@keystone-6/core");
var import_fields28 = require("@keystone-6/core/fields");
var GiftCardTransaction = (0, import_core27.list)({
  access: {
    operation: {
      query: permissions.canReadGiftCards,
      create: permissions.canManageGiftCards,
      update: permissions.canManageGiftCards,
      delete: permissions.canManageGiftCards
    }
  },
  ui: {
    listView: {
      initialColumns: ["giftCard", "amount", "createdAt", "order"]
    }
  },
  fields: {
    amount: (0, import_fields28.integer)({
      validation: { isRequired: true }
    }),
    ...trackingFields,
    giftCard: (0, import_fields28.relationship)({
      ref: "GiftCard.giftCardTransactions"
    }),
    order: (0, import_fields28.relationship)({
      ref: "RestaurantOrder"
    })
  }
});

// features/keystone/models/KitchenStation.ts
var import_core28 = require("@keystone-6/core");
var import_fields29 = require("@keystone-6/core/fields");
var KitchenStation = (0, import_core28.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "displayOrder", "isActive"]
    }
  },
  fields: {
    name: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Station name (e.g., Grill, Fryer, Salad, Expo)"
      }
    }),
    displayOrder: (0, import_fields29.integer)({
      defaultValue: 0,
      ui: {
        description: "Order in which stations are displayed (lower numbers first)"
      }
    }),
    isActive: (0, import_fields29.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this station is currently active"
      }
    }),
    // Relationships
    assignedStaff: (0, import_fields29.relationship)({
      ref: "User",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "email"],
        inlineConnect: true,
        description: "Staff members assigned to this station"
      }
    }),
    tickets: (0, import_fields29.relationship)({
      ref: "KitchenTicket.station",
      many: true
    }),
    prepStations: (0, import_fields29.relationship)({
      ref: "PrepStation.station",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/PrepStation.ts
var import_core29 = require("@keystone-6/core");
var import_fields30 = require("@keystone-6/core/fields");
var PrepStation = (0, import_core29.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  ui: {
    listView: {
      initialColumns: ["menuItem", "station", "preparationTime"]
    },
    labelField: "menuItem"
  },
  fields: {
    menuItem: (0, import_fields30.relationship)({
      ref: "MenuItem",
      ui: {
        displayMode: "select",
        description: "Menu item to be prepared at this station"
      }
    }),
    station: (0, import_fields30.relationship)({
      ref: "KitchenStation.prepStations",
      ui: {
        displayMode: "select",
        description: "Kitchen station for preparation"
      }
    }),
    preparationTime: (0, import_fields30.integer)({
      defaultValue: 15,
      ui: {
        description: "Expected preparation time in minutes"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/KitchenTicket.ts
var import_core30 = require("@keystone-6/core");
var import_fields31 = require("@keystone-6/core/fields");
var KitchenTicket = (0, import_core30.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  ui: {
    listView: {
      initialColumns: ["order", "station", "status", "priority", "firedAt"]
    }
  },
  fields: {
    status: (0, import_fields31.select)({
      type: "string",
      options: [
        { label: "New", value: "new" },
        { label: "In Progress", value: "in_progress" },
        { label: "Ready", value: "ready" },
        { label: "Served", value: "served" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "new",
      validation: { isRequired: true }
    }),
    priority: (0, import_fields31.integer)({
      defaultValue: 0,
      ui: {
        description: "Priority level (higher numbers = higher priority)"
      }
    }),
    ticketType: (0, import_fields31.select)({
      type: "string",
      options: [
        { label: "Prep", value: "prep" },
        { label: "Expediter", value: "expediter" }
      ],
      defaultValue: "prep",
      ui: {
        description: "Whether this ticket is shown in prep or expediter context"
      }
    }),
    items: (0, import_fields31.json)({
      ui: {
        description: "Order items for this ticket (JSON array)"
      }
    }),
    firedAt: (0, import_fields31.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the ticket was sent to the kitchen"
      }
    }),
    startedAt: (0, import_fields31.timestamp)({
      ui: {
        description: "When kitchen staff started working on this ticket"
      }
    }),
    completedAt: (0, import_fields31.timestamp)({
      ui: {
        description: "When all items were completed"
      }
    }),
    servedAt: (0, import_fields31.timestamp)({
      ui: {
        description: "When the items were served to the customer"
      }
    }),
    recalledAt: (0, import_fields31.timestamp)({
      ui: {
        description: "When the ticket was recalled back into preparation"
      }
    }),
    // Relationships
    order: (0, import_fields31.relationship)({
      ref: "RestaurantOrder",
      ui: {
        displayMode: "select",
        description: "Restaurant order this ticket belongs to"
      }
    }),
    station: (0, import_fields31.relationship)({
      ref: "KitchenStation.tickets",
      ui: {
        displayMode: "select",
        description: "Kitchen station assigned to this ticket"
      }
    }),
    orderItems: (0, import_fields31.relationship)({
      ref: "OrderItem.kitchenTickets",
      many: true,
      ui: {
        displayMode: "select",
        description: "Normalized order items included in this ticket"
      }
    }),
    preparedBy: (0, import_fields31.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who prepared this ticket"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Vendor.ts
var import_core31 = require("@keystone-6/core");
var import_fields32 = require("@keystone-6/core/fields");
var Vendor = (0, import_core31.list)({
  access: {
    operation: {
      query: permissions.canReadVendors,
      create: permissions.canManageVendors,
      update: permissions.canManageVendors,
      delete: permissions.canManageVendors
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "contact", "email", "phone"]
    }
  },
  fields: {
    name: (0, import_fields32.text)({
      validation: { isRequired: true },
      ui: {
        description: "Vendor company name"
      }
    }),
    contact: (0, import_fields32.text)({
      ui: {
        description: "Primary contact person"
      }
    }),
    email: (0, import_fields32.text)({
      validation: {
        match: {
          regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          explanation: "Please enter a valid email address"
        }
      },
      ui: {
        description: "Vendor email address"
      }
    }),
    phone: (0, import_fields32.text)({
      ui: {
        description: "Vendor phone number"
      }
    }),
    paymentTerms: (0, import_fields32.text)({
      ui: {
        description: "Payment terms (e.g., Net 30, COD)"
      }
    }),
    leadTime: (0, import_fields32.integer)({
      ui: {
        description: "Lead time in days for orders"
      }
    }),
    // Relationships
    ingredients: (0, import_fields32.relationship)({
      ref: "Ingredient.vendor",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/InventoryLocation.ts
var import_core32 = require("@keystone-6/core");
var import_fields33 = require("@keystone-6/core/fields");
var InventoryLocation = (0, import_core32.list)({
  access: {
    operation: {
      query: permissions.canReadInventory,
      create: permissions.canManageInventory,
      update: permissions.canManageInventory,
      delete: permissions.canManageInventory
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "isActive"]
    }
  },
  fields: {
    name: (0, import_fields33.text)({
      validation: { isRequired: true },
      ui: {
        description: "Storage location name (e.g., Walk-in, Freezer, Dry Storage)"
      }
    }),
    description: (0, import_fields33.text)({
      ui: {
        displayMode: "textarea",
        description: "Description of the storage location"
      }
    }),
    isActive: (0, import_fields33.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this location is currently in use"
      }
    }),
    // Relationships
    ingredients: (0, import_fields33.relationship)({
      ref: "Ingredient.location",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/Ingredient.ts
var import_core33 = require("@keystone-6/core");
var import_fields34 = require("@keystone-6/core/fields");
var Ingredient = (0, import_core33.list)({
  access: {
    operation: {
      query: permissions.canReadInventory,
      create: permissions.canManageInventory,
      update: permissions.canManageInventory,
      delete: permissions.canManageInventory
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "category", "currentStock", "unit", "parLevel"]
    }
  },
  fields: {
    name: (0, import_fields34.text)({
      validation: { isRequired: true },
      ui: {
        description: "Ingredient name"
      }
    }),
    unit: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Kilogram", value: "kg" },
        { label: "Pound", value: "lb" },
        { label: "Ounce", value: "oz" },
        { label: "Liter", value: "liter" },
        { label: "Gallon", value: "gallon" },
        { label: "Each", value: "each" },
        { label: "Case", value: "case" },
        { label: "Box", value: "box" }
      ],
      defaultValue: "lb",
      validation: { isRequired: true },
      ui: {
        description: "Unit of measurement"
      }
    }),
    category: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Produce", value: "produce" },
        { label: "Meat", value: "meat" },
        { label: "Dairy", value: "dairy" },
        { label: "Dry Goods", value: "dry_goods" },
        { label: "Beverages", value: "beverages" },
        { label: "Spices", value: "spices" },
        { label: "Seafood", value: "seafood" },
        { label: "Other", value: "other" }
      ],
      ui: {
        description: "Ingredient category"
      }
    }),
    currentStock: (0, import_fields34.decimal)({
      precision: 10,
      scale: 2,
      defaultValue: "0.00",
      validation: { isRequired: true },
      ui: {
        description: "Current stock quantity"
      }
    }),
    parLevel: (0, import_fields34.decimal)({
      precision: 10,
      scale: 2,
      ui: {
        description: "Ideal stock level to maintain"
      }
    }),
    reorderPoint: (0, import_fields34.decimal)({
      precision: 10,
      scale: 2,
      ui: {
        description: "Stock level at which to reorder"
      }
    }),
    reorderQuantity: (0, import_fields34.decimal)({
      precision: 10,
      scale: 2,
      ui: {
        description: "Quantity to order when restocking"
      }
    }),
    costPerUnit: (0, import_fields34.decimal)({
      precision: 10,
      scale: 2,
      ui: {
        description: "Cost per unit in dollars"
      }
    }),
    expirationDate: (0, import_fields34.timestamp)({
      ui: {
        description: "Expiration date for perishable items"
      }
    }),
    sku: (0, import_fields34.text)({
      ui: {
        description: "SKU or product code"
      }
    }),
    // Relationships
    vendor: (0, import_fields34.relationship)({
      ref: "Vendor.ingredients",
      ui: {
        displayMode: "select",
        description: "Primary vendor for this ingredient"
      }
    }),
    location: (0, import_fields34.relationship)({
      ref: "InventoryLocation.ingredients",
      ui: {
        displayMode: "select",
        description: "Storage location"
      }
    }),
    stockMovements: (0, import_fields34.relationship)({
      ref: "StockMovement.ingredient",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/StockMovement.ts
var import_core34 = require("@keystone-6/core");
var import_fields35 = require("@keystone-6/core/fields");
var StockMovement = (0, import_core34.list)({
  access: {
    operation: {
      query: permissions.canReadInventory,
      create: permissions.canManageInventory,
      update: permissions.canManageInventory,
      delete: permissions.canManageInventory
    }
  },
  ui: {
    listView: {
      initialColumns: ["ingredient", "type", "quantity", "createdAt", "createdBy"]
    }
  },
  fields: {
    type: (0, import_fields35.select)({
      type: "string",
      options: [
        { label: "Sale", value: "sale" },
        { label: "Waste", value: "waste" },
        { label: "Spoilage", value: "spoilage" },
        { label: "Theft", value: "theft" },
        { label: "Adjustment", value: "adjustment" },
        { label: "Delivery", value: "delivery" },
        { label: "Return", value: "return" }
      ],
      validation: { isRequired: true },
      ui: {
        description: "Type of stock movement"
      }
    }),
    quantity: (0, import_fields35.decimal)({
      precision: 10,
      scale: 2,
      validation: { isRequired: true },
      ui: {
        description: "Quantity moved (positive for additions, negative for reductions)"
      }
    }),
    reason: (0, import_fields35.text)({
      ui: {
        displayMode: "textarea",
        description: "Reason for the stock movement"
      }
    }),
    // Relationships
    ingredient: (0, import_fields35.relationship)({
      ref: "Ingredient.stockMovements",
      ui: {
        displayMode: "select",
        description: "Ingredient this movement affects"
      }
    }),
    createdBy: (0, import_fields35.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who recorded this movement"
      }
    }),
    order: (0, import_fields35.relationship)({
      ref: "RestaurantOrder",
      ui: {
        displayMode: "select",
        description: "Related order (for sale movements)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/StoreSettings.ts
var import_core35 = require("@keystone-6/core");
var import_fields36 = require("@keystone-6/core/fields");
var StoreSettings = (0, import_core35.list)({
  access: {
    operation: {
      query: () => true,
      // Public read for storefront
      create: permissions.canManageSettings,
      update: permissions.canManageSettings,
      delete: permissions.canManageSettings
    }
  },
  isSingleton: true,
  graphql: {
    plural: "storeSettingsItems"
  },
  ui: {
    listView: {
      initialColumns: ["name", "tagline", "phone"]
    }
  },
  fields: {
    // Basic Info
    name: (0, import_fields36.text)({
      validation: { isRequired: true },
      ui: { description: "Restaurant name" }
    }),
    tagline: (0, import_fields36.text)({
      ui: { description: "Short tagline (e.g., 'Artisan Burgers & Craft Sides')" }
    }),
    // Contact
    address: (0, import_fields36.text)({
      ui: { description: "Full street address" }
    }),
    phone: (0, import_fields36.text)({
      ui: { description: "Phone number" }
    }),
    email: (0, import_fields36.text)({
      ui: { description: "Contact email" }
    }),
    // Localization
    currencyCode: (0, import_fields36.text)({
      defaultValue: "USD",
      ui: { description: "ISO 4217 currency code (e.g. USD, EUR, JPY)" }
    }),
    locale: (0, import_fields36.text)({
      defaultValue: "en-US",
      ui: { description: "Locale used for formatting numbers/dates (e.g. en-US)" }
    }),
    timezone: (0, import_fields36.text)({
      defaultValue: "America/New_York",
      ui: { description: "IANA timezone (e.g. America/New_York)" }
    }),
    countryCode: (0, import_fields36.text)({
      defaultValue: "US",
      ui: { description: "Primary storefront country code (ISO 3166-1 alpha-2)" }
    }),
    // Hours (stored as JSON for flexibility)
    hours: (0, import_fields36.json)({
      defaultValue: {
        monday: "11:00 AM - 10:00 PM",
        tuesday: "11:00 AM - 10:00 PM",
        wednesday: "11:00 AM - 10:00 PM",
        thursday: "11:00 AM - 10:00 PM",
        friday: "11:00 AM - 11:00 PM",
        saturday: "10:00 AM - 11:00 PM",
        sunday: "10:00 AM - 9:00 PM"
      },
      ui: { description: "Operating hours by day of week" }
    }),
    // Tax
    taxRate: (0, import_fields36.decimal)({
      precision: 5,
      scale: 2,
      defaultValue: "8.75",
      ui: { description: "Tax rate percentage (e.g. 8.75 for 8.75%)" }
    }),
    // Delivery/Pickup Settings
    deliveryEnabled: (0, import_fields36.checkbox)({
      defaultValue: true,
      ui: { description: "Allow customers to choose delivery at checkout" }
    }),
    deliveryPostalCodes: (0, import_fields36.json)({
      defaultValue: ["11201"],
      ui: { description: "Allowed delivery ZIP/postal codes" }
    }),
    deliveryFee: (0, import_fields36.decimal)({
      precision: 10,
      scale: 2,
      defaultValue: "4.99",
      ui: { description: "Delivery fee amount" }
    }),
    deliveryMinimum: (0, import_fields36.decimal)({
      precision: 10,
      scale: 2,
      defaultValue: "15.00",
      ui: { description: "Minimum order for delivery" }
    }),
    pickupDiscount: (0, import_fields36.integer)({
      defaultValue: 10,
      ui: { description: "Pickup discount percentage" }
    }),
    estimatedDelivery: (0, import_fields36.text)({
      defaultValue: "30-45 min",
      ui: { description: "Estimated delivery time" }
    }),
    estimatedPickup: (0, import_fields36.text)({
      defaultValue: "15-20 min",
      ui: { description: "Estimated pickup time" }
    }),
    // Hero/Branding
    heroHeadline: (0, import_fields36.text)({
      defaultValue: "Fresh meals for pickup and delivery.",
      ui: { description: "Main hero headline" }
    }),
    heroSubheadline: (0, import_fields36.text)({
      defaultValue: "A modern ordering storefront with house favorites, quick pickup, and a menu built to customize.",
      ui: { description: "Hero subheadline/description" }
    }),
    heroTagline: (0, import_fields36.text)({
      defaultValue: "Made fresh daily \xB7 Ready when you are",
      ui: { description: "Small tagline above headline" }
    }),
    // Promo Banner
    promoBanner: (0, import_fields36.text)({
      defaultValue: "Free pickup discount \xB7 10% off all pickup orders",
      ui: { description: "Promotional banner text at top of page" }
    }),
    // Social/Reviews (optional display data)
    rating: (0, import_fields36.decimal)({
      precision: 2,
      scale: 1,
      defaultValue: "4.8",
      ui: { description: "Average rating to display" }
    }),
    reviewCount: (0, import_fields36.integer)({
      defaultValue: 0,
      ui: { description: "Number of reviews to display" }
    }),
    ...trackingFields
  }
});

// features/keystone/models/WaitlistEntry.ts
var import_core36 = require("@keystone-6/core");
var import_fields37 = require("@keystone-6/core/fields");
var WaitlistEntry = (0, import_core36.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  ui: {
    listView: {
      initialColumns: ["customerName", "partySize", "quotedWaitTime", "status", "addedAt"]
    },
    labelField: "customerName"
  },
  fields: {
    customerName: (0, import_fields37.text)({
      validation: { isRequired: true }
    }),
    phoneNumber: (0, import_fields37.text)({
      validation: { isRequired: true },
      ui: {
        description: "Phone number for SMS notifications"
      }
    }),
    partySize: (0, import_fields37.integer)({
      validation: { isRequired: true, min: 1 },
      defaultValue: 2
    }),
    quotedWaitTime: (0, import_fields37.integer)({
      validation: { min: 0 },
      defaultValue: 15,
      ui: {
        description: "Quoted wait time in minutes"
      }
    }),
    status: (0, import_fields37.select)({
      type: "string",
      options: [
        { label: "Waiting", value: "waiting" },
        { label: "Notified", value: "notified" },
        { label: "Seated", value: "seated" },
        { label: "Cancelled", value: "cancelled" },
        { label: "No Show", value: "no_show" }
      ],
      defaultValue: "waiting",
      ui: {
        displayMode: "segmented-control"
      }
    }),
    addedAt: (0, import_fields37.timestamp)({
      defaultValue: { kind: "now" },
      validation: { isRequired: true }
    }),
    notifiedAt: (0, import_fields37.timestamp)({
      ui: {
        description: "When the customer was notified their table is ready"
      }
    }),
    seatedAt: (0, import_fields37.timestamp)({
      ui: {
        description: "When the customer was actually seated"
      }
    }),
    notes: (0, import_fields37.text)({
      ui: {
        displayMode: "textarea",
        description: "Special requests, high chair needed, etc."
      }
    }),
    // Relationships
    table: (0, import_fields37.relationship)({
      ref: "Table",
      ui: {
        displayMode: "select",
        description: "Table assigned when seated"
      }
    }),
    addedBy: (0, import_fields37.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        labelField: "name",
        description: "Staff member who added this entry"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Shift.ts
var import_core37 = require("@keystone-6/core");
var import_fields38 = require("@keystone-6/core/fields");
var Shift = (0, import_core37.list)({
  access: {
    operation: {
      query: permissions.canReadStaff,
      create: permissions.canManageStaff,
      update: permissions.canManageStaff,
      delete: permissions.canManageStaff
    }
  },
  ui: {
    listView: {
      initialColumns: ["staff", "startTime", "endTime", "role", "status"]
    }
  },
  fields: {
    startTime: (0, import_fields38.timestamp)({
      validation: { isRequired: true }
    }),
    endTime: (0, import_fields38.timestamp)({
      validation: { isRequired: true }
    }),
    role: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Server", value: "server" },
        { label: "Bartender", value: "bartender" },
        { label: "Host", value: "host" },
        { label: "Busser", value: "busser" },
        { label: "Cook", value: "cook" },
        { label: "Dishwasher", value: "dishwasher" },
        { label: "Manager", value: "manager" }
      ],
      defaultValue: "server",
      validation: { isRequired: true }
    }),
    status: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Scheduled", value: "scheduled" },
        { label: "Started", value: "started" },
        { label: "Completed", value: "completed" },
        { label: "No Show", value: "no_show" },
        { label: "Called Out", value: "called_out" }
      ],
      defaultValue: "scheduled"
    }),
    hourlyRate: (0, import_fields38.decimal)({
      precision: 10,
      scale: 2,
      ui: { description: "Hourly rate for this shift" }
    }),
    clockIn: (0, import_fields38.timestamp)({
      ui: { description: "Actual clock in time" }
    }),
    clockOut: (0, import_fields38.timestamp)({
      ui: { description: "Actual clock out time" }
    }),
    notes: (0, import_fields38.text)({
      ui: { displayMode: "textarea" }
    }),
    hoursWorked: (0, import_fields38.virtual)({
      field: import_core37.graphql.field({
        type: import_core37.graphql.Float,
        resolve(item) {
          if (!item.clockIn || !item.clockOut) return null;
          const start = new Date(item.clockIn);
          const end = new Date(item.clockOut);
          return Math.round((end.getTime() - start.getTime()) / 36e5 * 100) / 100;
        }
      })
    }),
    laborCost: (0, import_fields38.virtual)({
      field: import_core37.graphql.field({
        type: import_core37.graphql.Float,
        resolve(item) {
          if (!item.clockIn || !item.clockOut || !item.hourlyRate) return null;
          const start = new Date(item.clockIn);
          const end = new Date(item.clockOut);
          const hours = (end.getTime() - start.getTime()) / 36e5;
          return Math.round(hours * parseFloat(item.hourlyRate) * 100) / 100;
        }
      })
    }),
    // Relationships
    staff: (0, import_fields38.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        labelField: "name"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/TipPool.ts
var import_core38 = require("@keystone-6/core");
var import_fields39 = require("@keystone-6/core/fields");
var TipPool = (0, import_core38.list)({
  access: {
    operation: {
      query: permissions.canReadStaff,
      create: permissions.canManageStaff,
      update: permissions.canManageStaff,
      delete: permissions.canManageStaff
    }
  },
  ui: {
    listView: {
      initialColumns: ["date", "tipPoolType", "totalTips", "status"]
    }
  },
  fields: {
    date: (0, import_fields39.timestamp)({
      validation: { isRequired: true },
      ui: { description: "Date this tip pool is for" }
    }),
    tipPoolType: (0, import_fields39.select)({
      type: "string",
      options: [
        { label: "Individual", value: "individual" },
        { label: "Pool by Role", value: "pool_by_role" },
        { label: "House Pool", value: "house_pool" }
      ],
      defaultValue: "individual"
    }),
    totalTips: (0, import_fields39.integer)({
      defaultValue: 0,
      validation: { isRequired: true },
      ui: { description: "Total tips in cents" }
    }),
    cashTips: (0, import_fields39.integer)({
      defaultValue: 0,
      ui: { description: "Cash tips in cents" }
    }),
    creditTips: (0, import_fields39.integer)({
      defaultValue: 0,
      ui: { description: "Credit tips in cents" }
    }),
    distributions: (0, import_fields39.json)({
      ui: {
        description: "Array of { staffId, staffName, role, hoursWorked, amount }"
      }
    }),
    status: (0, import_fields39.select)({
      type: "string",
      options: [
        { label: "Open", value: "open" },
        { label: "Calculated", value: "calculated" },
        { label: "Distributed", value: "distributed" }
      ],
      defaultValue: "open"
    }),
    notes: (0, import_fields39.text)({
      ui: { displayMode: "textarea" }
    }),
    // Relationships
    createdBy: (0, import_fields39.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        labelField: "name"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/TimeEntry.ts
var import_core39 = require("@keystone-6/core");
var import_fields40 = require("@keystone-6/core/fields");
var TimeEntry = (0, import_core39.list)({
  access: {
    operation: {
      query: permissions.canReadStaff,
      create: permissions.canManageStaff,
      update: permissions.canManageStaff,
      delete: permissions.canManageStaff
    }
  },
  ui: {
    listView: {
      initialColumns: ["staff", "clockIn", "clockOut", "role", "hoursWorked"]
    }
  },
  fields: {
    clockIn: (0, import_fields40.timestamp)({
      validation: { isRequired: true }
    }),
    clockOut: (0, import_fields40.timestamp)(),
    role: (0, import_fields40.select)({
      type: "string",
      options: [
        { label: "Server", value: "server" },
        { label: "Bartender", value: "bartender" },
        { label: "Host", value: "host" },
        { label: "Busser", value: "busser" },
        { label: "Cook", value: "cook" },
        { label: "Dishwasher", value: "dishwasher" },
        { label: "Manager", value: "manager" }
      ],
      defaultValue: "server"
    }),
    hourlyRate: (0, import_fields40.decimal)({
      precision: 10,
      scale: 2,
      ui: { description: "Hourly rate at time of clock in" }
    }),
    tips: (0, import_fields40.decimal)({
      precision: 10,
      scale: 2,
      defaultValue: "0.00",
      ui: { description: "Tips earned during this shift" }
    }),
    breakMinutes: (0, import_fields40.decimal)({
      precision: 5,
      scale: 0,
      defaultValue: "0",
      ui: { description: "Break time in minutes" }
    }),
    notes: (0, import_fields40.text)({
      ui: { displayMode: "textarea" }
    }),
    hoursWorked: (0, import_fields40.virtual)({
      field: import_core39.graphql.field({
        type: import_core39.graphql.Float,
        resolve(item) {
          if (!item.clockIn || !item.clockOut) return null;
          const start = new Date(item.clockIn);
          const end = new Date(item.clockOut);
          const breakMins = parseFloat(item.breakMinutes || "0");
          const totalMins = (end.getTime() - start.getTime()) / 6e4 - breakMins;
          return Math.round(totalMins / 60 * 100) / 100;
        }
      })
    }),
    laborCost: (0, import_fields40.virtual)({
      field: import_core39.graphql.field({
        type: import_core39.graphql.Float,
        resolve(item) {
          if (!item.clockIn || !item.clockOut || !item.hourlyRate) return null;
          const start = new Date(item.clockIn);
          const end = new Date(item.clockOut);
          const breakMins = parseFloat(item.breakMinutes || "0");
          const hours = ((end.getTime() - start.getTime()) / 6e4 - breakMins) / 60;
          return Math.round(hours * parseFloat(item.hourlyRate) * 100) / 100;
        }
      })
    }),
    // Relationships
    staff: (0, import_fields40.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        labelField: "name"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/WasteLog.ts
var import_core40 = require("@keystone-6/core");
var import_fields41 = require("@keystone-6/core/fields");
var WasteLog = (0, import_core40.list)({
  access: {
    operation: {
      query: permissions.canReadKitchen,
      create: permissions.canManageKitchen,
      update: permissions.canManageKitchen,
      delete: permissions.canManageKitchen
    }
  },
  ui: {
    listView: {
      initialColumns: ["ingredient", "quantity", "reason", "cost", "createdAt"]
    }
  },
  fields: {
    quantity: (0, import_fields41.decimal)({
      precision: 10,
      scale: 2,
      validation: { isRequired: true },
      ui: { description: "Amount wasted" }
    }),
    reason: (0, import_fields41.select)({
      type: "string",
      options: [
        { label: "Spoilage", value: "spoilage" },
        { label: "Preparation Error", value: "preparation_error" },
        { label: "Overproduction", value: "overproduction" },
        { label: "Plate Waste", value: "plate_waste" },
        { label: "Expired", value: "expired" },
        { label: "Damaged", value: "damaged" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "spoilage",
      validation: { isRequired: true }
    }),
    cost: (0, import_fields41.virtual)({
      field: import_core40.graphql.field({
        type: import_core40.graphql.Float,
        async resolve(item, args, context) {
          if (!item.ingredientId || !item.quantity) return 0;
          const ingredient = await context.sudo().query.Ingredient.findOne({
            where: { id: item.ingredientId },
            query: "costPerUnit"
          });
          if (!ingredient?.costPerUnit) return 0;
          return parseFloat(ingredient.costPerUnit) * parseFloat(item.quantity);
        }
      })
    }),
    notes: (0, import_fields41.text)({
      ui: { displayMode: "textarea" }
    }),
    // Relationships
    ingredient: (0, import_fields41.relationship)({
      ref: "Ingredient",
      ui: {
        displayMode: "select"
      }
    }),
    loggedBy: (0, import_fields41.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        labelField: "name"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/PurchaseOrder.ts
var import_core41 = require("@keystone-6/core");
var import_fields42 = require("@keystone-6/core/fields");
var PurchaseOrder = (0, import_core41.list)({
  access: {
    operation: {
      query: permissions.canReadInventory,
      create: permissions.canManageInventory,
      update: permissions.canManageInventory,
      delete: permissions.canManageInventory
    }
  },
  ui: {
    listView: {
      initialColumns: ["poNumber", "vendor", "orderDate", "status", "totalCost"]
    },
    labelField: "poNumber"
  },
  fields: {
    poNumber: (0, import_fields42.text)({
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    orderDate: (0, import_fields42.timestamp)({
      validation: { isRequired: true },
      defaultValue: { kind: "now" }
    }),
    expectedDelivery: (0, import_fields42.timestamp)({
      ui: { description: "Expected delivery date" }
    }),
    receivedDate: (0, import_fields42.timestamp)({
      ui: { description: "Actual received date" }
    }),
    status: (0, import_fields42.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Sent", value: "sent" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Shipped", value: "shipped" },
        { label: "Received", value: "received" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "draft"
    }),
    lineItems: (0, import_fields42.json)({
      ui: {
        description: "Array of { ingredientId, ingredientName, quantity, unit, unitCost, totalCost }"
      }
    }),
    totalCost: (0, import_fields42.virtual)({
      field: import_core41.graphql.field({
        type: import_core41.graphql.Float,
        resolve(item) {
          if (!item.lineItems) return 0;
          const items = item.lineItems;
          return items.reduce((sum, li) => sum + (li.totalCost || 0), 0);
        }
      })
    }),
    notes: (0, import_fields42.text)({
      ui: { displayMode: "textarea" }
    }),
    // Relationships
    vendor: (0, import_fields42.relationship)({
      ref: "Vendor",
      ui: {
        displayMode: "select"
      }
    }),
    createdBy: (0, import_fields42.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        labelField: "name"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/index.ts
var models = {
  User,
  Role,
  Section,
  Floor,
  Table,
  MenuCategory,
  MenuItem,
  MenuItemImage,
  MenuItemModifier,
  RestaurantOrder,
  Address,
  OrderItem,
  OrderCourse,
  KitchenMessage,
  Recipe,
  Reservation,
  Payment,
  PaymentCollection,
  PaymentSession,
  Cart,
  CartItem,
  PaymentProvider,
  ApiKey,
  Discount,
  DiscountRule,
  GiftCard,
  GiftCardTransaction,
  KitchenStation,
  PrepStation,
  KitchenTicket,
  Vendor,
  InventoryLocation,
  Ingredient,
  StockMovement,
  StoreSettings,
  WaitlistEntry,
  Shift,
  TipPool,
  TimeEntry,
  WasteLog,
  PurchaseOrder
};

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/mutations/updateActiveUser.ts
async function updateActiveUser(root, { data }, context) {
  const sudoContext = context.sudo();
  const session = context.session;
  if (!session?.itemId) {
    throw new Error("Not authenticated");
  }
  const existingUser = await sudoContext.query.User.findOne({
    where: { id: session.itemId }
  });
  if (!existingUser) {
    throw new Error("User not found");
  }
  return await sudoContext.db.User.updateOne({
    where: { id: session.itemId },
    data
  });
}
var updateActiveUser_default = updateActiveUser;

// lib/stripe.ts
var import_stripe = __toESM(require("stripe"));
var getStripeClient = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("Stripe secret key not configured. Set STRIPE_SECRET_KEY environment variable.");
  }
  return new import_stripe.default(stripeKey);
};
var stripeClient = null;
var stripe = new Proxy({}, {
  get(_, prop) {
    if (!stripeClient) {
      stripeClient = getStripeClient();
    }
    return stripeClient[prop];
  }
});
var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
async function createPaymentIntent({
  amount,
  currency = "usd",
  orderId,
  customerId,
  metadata = {}
}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata: {
      orderId,
      ...metadata
    },
    automatic_payment_methods: {
      enabled: true
    }
  });
  return paymentIntent;
}
async function capturePayment(paymentIntentId) {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
  return paymentIntent;
}
async function getPaymentIntent(paymentIntentId) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent;
}

// import("../../integrations/payment/**/*.ts") in features/keystone/utils/paymentProviderAdapter.ts
var globImport_integrations_payment_ts = __glob({
  "../../integrations/payment/index.ts": () => Promise.resolve().then(() => (init_payment(), payment_exports)),
  "../../integrations/payment/manual.ts": () => Promise.resolve().then(() => (init_manual(), manual_exports)),
  "../../integrations/payment/paypal.ts": () => Promise.resolve().then(() => (init_paypal(), paypal_exports)),
  "../../integrations/payment/stripe.ts": () => Promise.resolve().then(() => (init_stripe(), stripe_exports))
});

// features/keystone/utils/paymentProviderAdapter.ts
async function executeAdapterFunction({ provider, functionName, args }) {
  const functionPath = provider[functionName];
  if (functionPath.startsWith("http")) {
    const response = await fetch(functionPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, ...args })
    });
    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.statusText}`);
    }
    return response.json();
  }
  const adapter = await globImport_integrations_payment_ts(`../../integrations/payment/${functionPath}.ts`);
  const fn = adapter[functionName];
  if (!fn) {
    throw new Error(
      `Function ${functionName} not found in adapter ${functionPath}`
    );
  }
  try {
    return await fn({ provider, ...args });
  } catch (error) {
    throw new Error(
      `Error executing ${functionName} for provider ${functionPath}: ${error?.message || "Unknown error"}`
    );
  }
}
async function createPayment({ provider, cart, order, amount, currency }) {
  return executeAdapterFunction({
    provider,
    functionName: "createPaymentFunction",
    args: { cart, order, amount, currency }
  });
}
async function capturePayment2({ provider, paymentId, amount }) {
  return executeAdapterFunction({
    provider,
    functionName: "capturePaymentFunction",
    args: { paymentId, amount }
  });
}
async function getPaymentStatus({ provider, paymentId }) {
  return executeAdapterFunction({
    provider,
    functionName: "getPaymentStatusFunction",
    args: { paymentId }
  });
}
async function handleWebhook({ provider, event, headers }) {
  return executeAdapterFunction({
    provider,
    functionName: "handleWebhookFunction",
    args: { event, headers }
  });
}

// features/keystone/mutations/processPayment.ts
function cents(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}
async function applyTipToOrder(orderId, tipAmount, context) {
  const sudo = context.sudo();
  const order = await sudo.query.RestaurantOrder.findOne({
    where: { id: orderId },
    query: "id total tip"
  });
  if (!order) {
    return null;
  }
  const currentTip = cents(order.tip);
  const nextTip = Math.max(currentTip, cents(tipAmount));
  if (nextTip !== currentTip) {
    const baseTotal = Math.max(0, cents(order.total) - currentTip);
    const nextTotal = baseTotal + nextTip;
    await sudo.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: {
        tip: nextTip,
        total: nextTotal
      }
    });
    return {
      ...order,
      tip: nextTip,
      total: nextTotal
    };
  }
  return order;
}
async function maybeCompleteOrder(orderId, context) {
  const sudo = context.sudo();
  const [order, payments] = await Promise.all([
    sudo.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: "id status total"
    }),
    sudo.query.Payment.findMany({
      where: {
        order: { id: { equals: orderId } },
        status: { equals: "succeeded" }
      },
      query: "id amount"
    })
  ]);
  if (!order) {
    return;
  }
  const totalPaid = payments.reduce((sum, payment) => sum + cents(payment.amount), 0);
  const totalDue = cents(order.total);
  if (totalPaid >= totalDue && order.status !== "completed") {
    await sudo.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: { status: "completed" }
    });
  }
}
async function processPayment(root, args, context) {
  if (!permissions.canManagePayments({ session: context.session })) {
    return {
      success: false,
      paymentId: null,
      clientSecret: null,
      error: "Not authorized to process payment"
    };
  }
  const { orderId, amount, paymentMethod, tipAmount = 0 } = args;
  try {
    const sudo = context.sudo();
    const settings = await sudo.query.StoreSettings.findOne({
      where: { id: "1" },
      query: "currencyCode"
    });
    const currency = (settings?.currencyCode || "USD").toLowerCase();
    const order = await sudo.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: "id orderNumber status total tip"
    });
    if (!order) {
      return {
        success: false,
        paymentId: null,
        clientSecret: null,
        error: "Order not found"
      };
    }
    if (order.status === "completed") {
      return {
        success: false,
        paymentId: null,
        clientSecret: null,
        error: "Order is already completed"
      };
    }
    await applyTipToOrder(orderId, tipAmount, context);
    const isImmediateSettlement = ["cash", "gift_card"].includes(paymentMethod);
    const providerCode = paymentMethod === "cash" ? "pp_system_default" : ["credit_card", "debit_card", "apple_pay", "google_pay"].includes(paymentMethod) ? "pp_stripe_stripe" : null;
    const providers = providerCode ? await context.query.PaymentProvider.findMany({
      where: {
        code: { equals: providerCode },
        isInstalled: { equals: true }
      },
      query: "id code isInstalled createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction credentials metadata"
    }) : [];
    const provider = providers[0] || null;
    let clientSecret = null;
    let providerPaymentId = null;
    let paymentStatus = isImmediateSettlement ? "succeeded" : "pending";
    if (!isImmediateSettlement && provider && provider.isInstalled) {
      const providerResponse = await createPayment({
        provider,
        order,
        amount,
        currency
      });
      clientSecret = providerResponse?.clientSecret || null;
      providerPaymentId = providerResponse?.paymentIntentId || providerResponse?.orderId || providerResponse?.paymentId || null;
      paymentStatus = providerResponse?.status || "pending";
    } else if (!isImmediateSettlement) {
      const paymentIntent = await createPaymentIntent({
        amount,
        orderId,
        metadata: {
          orderNumber: order.orderNumber || "",
          paymentMethod
        }
      });
      clientSecret = paymentIntent.client_secret;
      providerPaymentId = paymentIntent.id;
    }
    const payment = await context.db.Payment.createOne({
      data: {
        amount,
        status: paymentStatus,
        paymentMethod,
        currencyCode: currency.toUpperCase(),
        providerPaymentId,
        data: {
          paymentIntentId: providerPaymentId,
          clientSecret
        },
        paymentProvider: provider ? { connect: { id: provider.id } } : void 0,
        tipAmount,
        processedAt: paymentStatus === "succeeded" ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
        order: { connect: { id: orderId } },
        processedBy: { connect: { id: context.session.itemId } }
      }
    });
    if (paymentStatus === "succeeded") {
      await maybeCompleteOrder(orderId, context);
    }
    return {
      success: true,
      paymentId: payment.id,
      clientSecret,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error processing payment: ${errorMessage}`);
    return {
      success: false,
      paymentId: null,
      clientSecret: null,
      error: errorMessage
    };
  }
}
async function capturePaymentMutation(root, args, context) {
  if (!permissions.canManagePayments({ session: context.session })) {
    return {
      success: false,
      status: null,
      error: "Not authorized to capture payment"
    };
  }
  const { paymentIntentId } = args;
  try {
    const sudoContext = context.sudo();
    const payments = await sudoContext.query.Payment.findMany({
      where: {
        providerPaymentId: { equals: paymentIntentId }
      },
      query: "id providerPaymentId data order { id } paymentProvider { id code isInstalled createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction credentials metadata }"
    });
    const payment = payments[0];
    if (!payment) {
      return {
        success: false,
        status: null,
        error: "Payment not found"
      };
    }
    const provider = payment.paymentProvider;
    const capturedPayment = provider ? await capturePayment2({
      provider,
      paymentId: payment.providerPaymentId || paymentIntentId,
      amount: args.amount ?? void 0
    }) : await capturePayment(paymentIntentId);
    const didSucceed = ["succeeded", "captured"].includes(capturedPayment.status);
    await context.db.Payment.updateOne({
      where: { id: payment.id },
      data: {
        status: didSucceed ? "succeeded" : "processing",
        processedAt: didSucceed ? (/* @__PURE__ */ new Date()).toISOString() : void 0
      }
    });
    if (didSucceed && payment.order?.id) {
      await maybeCompleteOrder(payment.order.id, context);
    }
    return {
      success: true,
      status: didSucceed ? "succeeded" : capturedPayment.status,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error capturing payment: ${errorMessage}`);
    return {
      success: false,
      status: null,
      error: errorMessage
    };
  }
}
async function getPaymentStatus2(root, args, context) {
  if (!(permissions.canReadPayments({ session: context.session }) || permissions.canManagePayments({ session: context.session }))) {
    return {
      status: null,
      amount: null,
      error: "Not authorized to check payment status"
    };
  }
  try {
    const sudoContext = context.sudo();
    const payments = await sudoContext.query.Payment.findMany({
      where: {
        providerPaymentId: { equals: args.paymentIntentId }
      },
      query: "id providerPaymentId data paymentProvider { id code isInstalled createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction credentials metadata }"
    });
    const payment = payments[0];
    if (!payment) {
      return {
        status: null,
        amount: null,
        error: "Payment not found"
      };
    }
    const provider = payment.paymentProvider;
    const paymentStatus = provider ? await getPaymentStatus({
      provider,
      paymentId: payment.providerPaymentId || args.paymentIntentId
    }) : await getPaymentIntent(args.paymentIntentId);
    return {
      status: paymentStatus.status,
      amount: paymentStatus.amount ?? null,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return {
      status: null,
      amount: null,
      error: errorMessage
    };
  }
}

// features/lib/restaurant-order-pricing.ts
var NO_DIVISION_CURRENCIES2 = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau"
];
function toNumber(value, fallback = 0) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function toMinorUnits(value, currencyCode = "USD") {
  const parsed = toNumber(value);
  const shouldDivideBy100 = !NO_DIVISION_CURRENCIES2.includes(currencyCode.toLowerCase());
  return shouldDivideBy100 ? Math.round(parsed * 100) : Math.round(parsed);
}
function isDeliveryOrder(orderType) {
  return orderType === "delivery";
}
function isPickupLikeOrder(orderType) {
  return orderType === "pickup" || orderType === "takeout";
}
function calculateRestaurantTotals({
  subtotal,
  orderType,
  tipPercent,
  deliveryFee,
  deliveryMinimum,
  pickupDiscountPercent,
  taxRate,
  currencyCode = "USD"
}) {
  const normalizedSubtotal = toNumber(subtotal);
  const normalizedTipPercent = toNumber(tipPercent);
  const normalizedTaxRate = toNumber(taxRate);
  const normalizedPickupDiscountPercent = toNumber(pickupDiscountPercent);
  const normalizedDeliveryFee = isDeliveryOrder(orderType) ? toMinorUnits(deliveryFee, currencyCode) : 0;
  const normalizedDeliveryMinimum = isDeliveryOrder(orderType) ? toMinorUnits(deliveryMinimum, currencyCode) : 0;
  const pickupDiscount = isPickupLikeOrder(orderType) ? Math.round(normalizedSubtotal * (normalizedPickupDiscountPercent / 100)) : 0;
  const tax = Math.round(normalizedSubtotal * (normalizedTaxRate / 100));
  const tip = Math.round(normalizedSubtotal * (normalizedTipPercent / 100));
  const total = normalizedSubtotal - pickupDiscount + normalizedDeliveryFee + tax + tip;
  const deliveryMinimumNotMet = isDeliveryOrder(orderType) && normalizedDeliveryMinimum > 0 && normalizedSubtotal < normalizedDeliveryMinimum;
  return {
    subtotal: normalizedSubtotal,
    deliveryFee: normalizedDeliveryFee,
    deliveryMinimum: normalizedDeliveryMinimum,
    deliveryMinimumNotMet,
    deliveryMinimumShortfall: deliveryMinimumNotMet ? normalizedDeliveryMinimum - normalizedSubtotal : 0,
    pickupDiscount,
    tax,
    tip,
    total
  };
}

// features/lib/delivery-zones.ts
function normalizeCountryCode(value) {
  return (value || "").trim().toUpperCase();
}
function normalizePostalCode(value) {
  return (value || "").trim().toUpperCase().replace(/[\s-]+/g, "");
}
function parseDeliveryPostalCodes(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizePostalCode(String(entry ?? ""))).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((entry) => normalizePostalCode(entry)).filter(Boolean);
  }
  return [];
}
function getUniqueDeliveryPostalCodes(value) {
  return Array.from(new Set(parseDeliveryPostalCodes(value)));
}
function getDeliveryEligibility(params) {
  const deliveryEnabled = Boolean(params.deliveryEnabled);
  const storeCountryCode = normalizeCountryCode(params.storeCountryCode);
  const addressCountryCode = normalizeCountryCode(params.addressCountryCode);
  const addressPostalCode = normalizePostalCode(params.addressPostalCode);
  const allowedPostalCodes = getUniqueDeliveryPostalCodes(params.deliveryPostalCodes);
  if (!deliveryEnabled) {
    return {
      eligible: false,
      reason: "delivery_disabled",
      allowedPostalCodes,
      normalizedPostalCode: addressPostalCode
    };
  }
  if (!addressCountryCode || !addressPostalCode) {
    return {
      eligible: false,
      reason: "missing_address",
      allowedPostalCodes,
      normalizedPostalCode: addressPostalCode
    };
  }
  if (storeCountryCode && addressCountryCode !== storeCountryCode) {
    return {
      eligible: false,
      reason: "country_mismatch",
      allowedPostalCodes,
      normalizedPostalCode: addressPostalCode
    };
  }
  if (allowedPostalCodes.length === 0) {
    return {
      eligible: false,
      reason: "missing_delivery_zones",
      allowedPostalCodes,
      normalizedPostalCode: addressPostalCode
    };
  }
  if (!allowedPostalCodes.includes(addressPostalCode)) {
    return {
      eligible: false,
      reason: "postal_code_outside_zone",
      allowedPostalCodes,
      normalizedPostalCode: addressPostalCode
    };
  }
  return {
    eligible: true,
    reason: "eligible",
    allowedPostalCodes,
    normalizedPostalCode: addressPostalCode
  };
}

// features/keystone/utils/deliveryValidation.ts
async function getStoreDeliverySettings(context) {
  return context.sudo().query.StoreSettings.findOne({
    where: { id: "1" },
    query: `
      id
      countryCode
      deliveryEnabled
      deliveryPostalCodes
      deliveryMinimum
      deliveryFee
      pickupDiscount
      taxRate
      currencyCode
    `
  });
}
function getDeliveryErrorMessage(reason) {
  switch (reason) {
    case "delivery_disabled":
      return "Delivery is not available for this restaurant.";
    case "missing_address":
      return "Delivery address is incomplete. Add street address, city, postal code, and country code.";
    case "country_mismatch":
      return "This address is outside the restaurant's delivery country.";
    case "postal_code_outside_zone":
      return "This address is outside the restaurant's delivery zone.";
    case "missing_delivery_zones":
      return "Delivery zones have not been configured for this restaurant.";
    default:
      return "Delivery is not available for this address.";
  }
}
function assertDeliveryModeAllowed(params) {
  if (params.orderType === "delivery" && !params.storeSettings?.deliveryEnabled) {
    throw new Error("Delivery is not available for this restaurant.");
  }
}
function assertDeliveryAddressComplete(params) {
  if (params.orderType !== "delivery") {
    return;
  }
  if (!params.deliveryAddress || !params.deliveryCity || !params.deliveryZip || !params.deliveryCountryCode) {
    throw new Error("Delivery address is incomplete. Add street address, city, postal code, and country code.");
  }
}
function assertDeliveryAddressEligible(params) {
  if (params.orderType !== "delivery") {
    return;
  }
  const eligibility = getDeliveryEligibility({
    deliveryEnabled: params.storeSettings?.deliveryEnabled,
    storeCountryCode: params.storeSettings?.countryCode,
    deliveryPostalCodes: params.storeSettings?.deliveryPostalCodes,
    addressCountryCode: params.deliveryCountryCode,
    addressPostalCode: params.deliveryZip
  });
  if (!eligibility.eligible) {
    throw new Error(getDeliveryErrorMessage(eligibility.reason));
  }
}
function normalizeDeliveryFields(data) {
  const next = { ...data };
  if ("deliveryCountryCode" in next) {
    next.deliveryCountryCode = normalizeCountryCode(next.deliveryCountryCode);
  }
  if ("deliveryZip" in next) {
    next.deliveryZip = normalizePostalCode(next.deliveryZip);
  }
  return next;
}

// features/keystone/mutations/splitCheck.ts
function cents2(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
async function calculateTotalsFromItems(items, orderType, context) {
  const settings = await getStoreDeliverySettings(context);
  const subtotal = items.reduce((sum, item) => {
    return sum + cents2(item.price) * (item.quantity || 0);
  }, 0);
  const { tax, total } = calculateRestaurantTotals({
    subtotal,
    orderType,
    taxRate: settings?.taxRate,
    currencyCode: settings?.currencyCode || "USD"
  });
  return { subtotal, tax, total };
}
function buildSplitOrderNumber(suffix) {
  const now = /* @__PURE__ */ new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timePart = now.getTime().toString().slice(-4);
  return `${datePart}-${timePart}-${suffix}`;
}
async function splitCheckByItem(root, args, context) {
  if (!permissions.canManageOrders({ session: context.session })) {
    return {
      success: false,
      newOrderIds: [],
      error: "Not authorized to split check"
    };
  }
  const { orderId, itemIds } = args;
  if (!itemIds || itemIds.length === 0) {
    return {
      success: false,
      newOrderIds: [],
      error: "Must select at least one item to split"
    };
  }
  try {
    const originalOrder = await context.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: "id orderNumber orderType orderSource status specialInstructions server { id } tables { id }"
    });
    if (!originalOrder) {
      return {
        success: false,
        newOrderIds: [],
        error: "Order not found"
      };
    }
    const itemsToMove = await context.query.OrderItem.findMany({
      where: {
        id: { in: itemIds },
        order: { id: { equals: orderId } }
      },
      query: "id quantity price"
    });
    if (itemsToMove.length === 0) {
      return {
        success: false,
        newOrderIds: [],
        error: "No valid items found to split"
      };
    }
    const newTotals = await calculateTotalsFromItems(itemsToMove, originalOrder.orderType, context);
    const newOrder = await context.db.RestaurantOrder.createOne({
      data: {
        orderNumber: buildSplitOrderNumber("S"),
        orderType: originalOrder.orderType || "dine_in",
        orderSource: originalOrder.orderSource || "pos",
        status: originalOrder.status || "open",
        guestCount: 1,
        subtotal: newTotals.subtotal,
        tax: newTotals.tax,
        total: newTotals.total,
        specialInstructions: originalOrder.specialInstructions ? `${originalOrder.specialInstructions} | Split from ${originalOrder.orderNumber}` : `Split from ${originalOrder.orderNumber}`,
        tables: (originalOrder.tables || []).length ? { connect: (originalOrder.tables || []).map((t) => ({ id: t.id })) } : void 0,
        server: originalOrder.server?.id ? { connect: { id: originalOrder.server.id } } : void 0
      }
    });
    for (const item of itemsToMove) {
      await context.db.OrderItem.updateOne({
        where: { id: item.id },
        data: {
          order: { connect: { id: newOrder.id } }
        }
      });
    }
    const remainingItems = await context.query.OrderItem.findMany({
      where: {
        order: { id: { equals: orderId } }
      },
      query: "id quantity price"
    });
    const remainingTotals = await calculateTotalsFromItems(remainingItems, originalOrder.orderType, context);
    await context.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: {
        subtotal: remainingTotals.subtotal,
        tax: remainingTotals.tax,
        total: remainingTotals.total
      }
    });
    return {
      success: true,
      newOrderIds: [newOrder.id],
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error splitting check by item: ${errorMessage}`);
    return {
      success: false,
      newOrderIds: [],
      error: errorMessage
    };
  }
}
async function splitCheckByGuest(root, args, context) {
  if (!permissions.canManageOrders({ session: context.session })) {
    return {
      success: false,
      newOrderIds: [],
      error: "Not authorized to split check"
    };
  }
  const { orderId, guestCount } = args;
  if (guestCount < 2) {
    return {
      success: false,
      newOrderIds: [],
      error: "Guest count must be at least 2 to split"
    };
  }
  try {
    const originalOrder = await context.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: "id orderNumber orderType orderSource status specialInstructions total subtotal tax server { id } tables { id }"
    });
    if (!originalOrder) {
      return {
        success: false,
        newOrderIds: [],
        error: "Order not found"
      };
    }
    const totalAmount = cents2(originalOrder.total);
    const totalSubtotal = cents2(originalOrder.subtotal);
    const totalTax = cents2(originalOrder.tax);
    const splitTotalBase = Math.floor(totalAmount / guestCount);
    const splitSubtotalBase = Math.floor(totalSubtotal / guestCount);
    const splitTaxBase = Math.floor(totalTax / guestCount);
    let totalRemainder = totalAmount - splitTotalBase * guestCount;
    let subtotalRemainder = totalSubtotal - splitSubtotalBase * guestCount;
    let taxRemainder = totalTax - splitTaxBase * guestCount;
    const newOrderIds = [];
    for (let i = 1; i < guestCount; i++) {
      const thisTotal = splitTotalBase + (totalRemainder > 0 ? 1 : 0);
      const thisSubtotal = splitSubtotalBase + (subtotalRemainder > 0 ? 1 : 0);
      const thisTax = splitTaxBase + (taxRemainder > 0 ? 1 : 0);
      if (totalRemainder > 0) totalRemainder -= 1;
      if (subtotalRemainder > 0) subtotalRemainder -= 1;
      if (taxRemainder > 0) taxRemainder -= 1;
      const newOrder = await context.db.RestaurantOrder.createOne({
        data: {
          orderNumber: buildSplitOrderNumber(`G${i + 1}`),
          orderType: originalOrder.orderType || "dine_in",
          orderSource: originalOrder.orderSource || "pos",
          status: originalOrder.status || "open",
          guestCount: 1,
          subtotal: thisSubtotal,
          tax: thisTax,
          total: thisTotal,
          specialInstructions: `Split from order ${originalOrder.orderNumber} (Guest ${i + 1} of ${guestCount})`,
          tables: (originalOrder.tables || []).length ? { connect: (originalOrder.tables || []).map((t) => ({ id: t.id })) } : void 0,
          server: originalOrder.server?.id ? { connect: { id: originalOrder.server.id } } : void 0
        }
      });
      newOrderIds.push(newOrder.id);
    }
    const originalTotal = splitTotalBase + (totalRemainder > 0 ? 1 : 0);
    const originalSubtotal = splitSubtotalBase + (subtotalRemainder > 0 ? 1 : 0);
    const originalTax = splitTaxBase + (taxRemainder > 0 ? 1 : 0);
    await context.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: {
        guestCount: 1,
        subtotal: originalSubtotal,
        tax: originalTax,
        total: originalTotal,
        specialInstructions: originalOrder.specialInstructions ? `${originalOrder.specialInstructions} | Split check (Guest 1 of ${guestCount})` : `Split check (Guest 1 of ${guestCount})`
      }
    });
    return {
      success: true,
      newOrderIds,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error splitting check by guest: ${errorMessage}`);
    return {
      success: false,
      newOrderIds: [],
      error: errorMessage
    };
  }
}

// features/keystone/mutations/voidComp.ts
function canManageOrders(context) {
  return permissions.canManageOrders({ session: context.session });
}
async function recalculateOrderTotals({
  order,
  subtotal,
  context
}) {
  const settings = await getStoreDeliverySettings(context);
  const safeSubtotal = Math.max(0, subtotal);
  const { tax } = calculateRestaurantTotals({
    subtotal: safeSubtotal,
    orderType: order.orderType,
    taxRate: settings?.taxRate,
    currencyCode: settings?.currencyCode || order.currencyCode || "USD"
  });
  const tip = Math.max(0, order.tip || 0);
  const discount = Math.max(0, order.discount || 0);
  const total = Math.max(0, safeSubtotal + tax + tip - discount);
  return {
    subtotal: safeSubtotal,
    tax: Math.max(0, tax),
    total
  };
}
async function voidOrderItem(root, args, context) {
  if (!canManageOrders(context)) {
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: "Not authorized to void items"
    };
  }
  const { orderItemId, reason } = args;
  if (!reason || reason.trim() === "") {
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: "Reason is required for void"
    };
  }
  try {
    const orderItem = await context.db.OrderItem.findOne({
      where: { id: orderItemId }
    });
    if (!orderItem) {
      return {
        success: false,
        requiresManagerApproval: false,
        adjustedAmount: null,
        error: "Order item not found"
      };
    }
    const voidAmount = (orderItem.price || 0) * (orderItem.quantity || 0);
    await context.db.OrderItem.deleteOne({
      where: { id: orderItemId }
    });
    if (orderItem.orderId) {
      const order = await context.db.RestaurantOrder.findOne({
        where: { id: orderItem.orderId }
      });
      if (order) {
        const totals = await recalculateOrderTotals({
          order,
          subtotal: (order.subtotal || 0) - voidAmount,
          context
        });
        await context.db.RestaurantOrder.updateOne({
          where: { id: orderItem.orderId },
          data: {
            ...totals,
            specialInstructions: order.specialInstructions ? `${order.specialInstructions} | VOID: ${reason}` : `VOID: ${reason}`
          }
        });
      }
    }
    return {
      success: true,
      requiresManagerApproval: false,
      adjustedAmount: voidAmount,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error voiding item: ${errorMessage}`);
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: errorMessage
    };
  }
}
async function compOrderItem(root, args, context) {
  if (!canManageOrders(context)) {
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: "Not authorized to comp items"
    };
  }
  const { orderItemId, reason, compAmount } = args;
  if (!reason || reason.trim() === "") {
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: "Reason is required for comp"
    };
  }
  try {
    const orderItem = await context.db.OrderItem.findOne({
      where: { id: orderItemId }
    });
    if (!orderItem) {
      return {
        success: false,
        requiresManagerApproval: false,
        adjustedAmount: null,
        error: "Order item not found"
      };
    }
    const itemTotal = (orderItem.price || 0) * (orderItem.quantity || 0);
    const actualCompAmount = compAmount !== void 0 && compAmount !== null ? Math.min(compAmount, itemTotal) : itemTotal;
    const perItemComp = Math.floor(actualCompAmount / (orderItem.quantity || 1));
    const newPrice = (orderItem.price || 0) - perItemComp;
    if (newPrice <= 0) {
      await context.db.OrderItem.deleteOne({
        where: { id: orderItemId }
      });
    } else {
      await context.db.OrderItem.updateOne({
        where: { id: orderItemId },
        data: {
          price: newPrice,
          specialInstructions: orderItem.specialInstructions ? `${orderItem.specialInstructions} | COMP: ${reason}` : `COMP: ${reason}`
        }
      });
    }
    if (orderItem.orderId) {
      const order = await context.db.RestaurantOrder.findOne({
        where: { id: orderItem.orderId }
      });
      if (order) {
        const totals = await recalculateOrderTotals({
          order,
          subtotal: (order.subtotal || 0) - actualCompAmount,
          context
        });
        await context.db.RestaurantOrder.updateOne({
          where: { id: orderItem.orderId },
          data: {
            ...totals,
            specialInstructions: order.specialInstructions ? `${order.specialInstructions} | COMP: ${reason}` : `COMP: ${reason}`
          }
        });
      }
    }
    return {
      success: true,
      requiresManagerApproval: false,
      adjustedAmount: actualCompAmount,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error comping item: ${errorMessage}`);
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: errorMessage
    };
  }
}
async function voidOrder(root, args, context) {
  if (!canManageOrders(context)) {
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: "Not authorized to void orders"
    };
  }
  const { orderId, reason } = args;
  if (!reason || reason.trim() === "") {
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: "Reason is required for void"
    };
  }
  try {
    const order = await context.db.RestaurantOrder.findOne({
      where: { id: orderId }
    });
    if (!order) {
      return {
        success: false,
        requiresManagerApproval: false,
        adjustedAmount: null,
        error: "Order not found"
      };
    }
    const voidAmount = order.total || 0;
    const orderItems = await context.db.OrderItem.findMany({
      where: { order: { id: { equals: orderId } } }
    });
    for (const item of orderItems) {
      await context.db.OrderItem.deleteOne({
        where: { id: item.id }
      });
    }
    await context.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: {
        status: "cancelled",
        subtotal: 0,
        tax: 0,
        total: 0,
        specialInstructions: order.specialInstructions ? `${order.specialInstructions} | VOIDED: ${reason}` : `VOIDED: ${reason}`
      }
    });
    return {
      success: true,
      requiresManagerApproval: false,
      adjustedAmount: voidAmount,
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error voiding order: ${errorMessage}`);
    return {
      success: false,
      requiresManagerApproval: false,
      adjustedAmount: null,
      error: errorMessage
    };
  }
}

// features/keystone/utils/cartAccess.ts
var cookie = __toESM(require("cookie"));
function getRequestCartId(context) {
  const cookieHeader = context.req?.headers?.cookie;
  if (!cookieHeader) return void 0;
  return cookie.parse(cookieHeader)._restaurant_cart_id;
}
function canBypassCartAccess(context, mode) {
  if (permissions.canManageOrders({ session: context.session })) return true;
  if (mode === "read" && permissions.canReadOrders({ session: context.session })) return true;
  return false;
}
function assertOwnership({
  context,
  cartId,
  cartUserId,
  mode
}) {
  if (canBypassCartAccess(context, mode)) return;
  const requestCartId = getRequestCartId(context);
  const sessionItemId = context.session?.itemId;
  const ownsByUser = Boolean(sessionItemId && cartUserId && cartUserId === sessionItemId);
  const ownsByCookie = requestCartId === cartId;
  if (!ownsByUser && !ownsByCookie) {
    throw new Error("Access denied");
  }
}
async function assertCanAccessCart(context, cartId, mode = "write") {
  const cart = await context.sudo().query.Cart.findOne({
    where: { id: cartId },
    query: `
      id
      user {
        id
      }
    `
  });
  if (!cart) {
    throw new Error("Cart not found");
  }
  assertOwnership({
    context,
    cartId: cart.id,
    cartUserId: cart.user?.id,
    mode
  });
  return cart;
}
async function assertCanAccessCartItem(context, cartItemId, mode = "write") {
  const cartItem = await context.sudo().query.CartItem.findOne({
    where: { id: cartItemId },
    query: `
      id
      cart {
        id
        user {
          id
        }
      }
    `
  });
  if (!cartItem?.cart?.id) {
    throw new Error("Cart not found for this item");
  }
  assertOwnership({
    context,
    cartId: cartItem.cart.id,
    cartUserId: cartItem.cart.user?.id,
    mode
  });
  return cartItem;
}

// features/keystone/mutations/initiatePaymentSession.ts
async function initiatePaymentSession(root, { cartId, paymentProviderId }, context) {
  const sudoContext = context.sudo();
  await assertCanAccessCart(context, cartId, "write");
  const cart = await sudoContext.query.Cart.findOne({
    where: { id: cartId },
    query: `
      id
      orderType
      subtotal
      deliveryAddress
      deliveryCity
      deliveryCountryCode
      deliveryZip
      tipPercent
      paymentCollection {
        id
        amount
        paymentSessions {
          id
          isSelected
          isInitiated
          amount
          paymentProvider {
            id
            code
          }
          data
        }
      }
    `
  });
  if (!cart) {
    throw new Error("Cart not found");
  }
  const provider = await sudoContext.query.PaymentProvider.findOne({
    where: { code: paymentProviderId },
    query: `
      id
      code
      isInstalled
      createPaymentFunction
      capturePaymentFunction
      refundPaymentFunction
      getPaymentStatusFunction
      generatePaymentLinkFunction
      credentials
    `
  });
  if (!provider || !provider.isInstalled) {
    throw new Error(`Payment provider ${paymentProviderId} not found or not installed`);
  }
  const settings = await getStoreDeliverySettings(context);
  const currency = settings?.currencyCode || "USD";
  assertDeliveryAddressComplete({
    orderType: cart.orderType,
    deliveryAddress: cart.deliveryAddress,
    deliveryCity: cart.deliveryCity,
    deliveryCountryCode: cart.deliveryCountryCode,
    deliveryZip: cart.deliveryZip
  });
  assertDeliveryAddressEligible({
    orderType: cart.orderType,
    storeSettings: settings,
    deliveryCountryCode: cart.deliveryCountryCode,
    deliveryZip: cart.deliveryZip
  });
  const pricing = calculateRestaurantTotals({
    subtotal: cart.subtotal || 0,
    orderType: cart.orderType,
    tipPercent: cart.tipPercent,
    deliveryFee: settings?.deliveryFee,
    deliveryMinimum: settings?.deliveryMinimum,
    pickupDiscountPercent: settings?.pickupDiscount,
    taxRate: settings?.taxRate,
    currencyCode: currency
  });
  if (pricing.deliveryMinimumNotMet) {
    throw new Error(`Delivery orders require a minimum subtotal of ${settings?.deliveryMinimum || "0.00"}.`);
  }
  const amount = pricing.total;
  if (!cart.paymentCollection) {
    cart.paymentCollection = await sudoContext.query.PaymentCollection.createOne({
      data: {
        cart: { connect: { id: cart.id } },
        amount,
        description: "default"
      },
      query: "id"
    });
  } else if ((cart.paymentCollection.amount || 0) !== amount) {
    await sudoContext.query.PaymentCollection.updateOne({
      where: { id: cart.paymentCollection.id },
      data: { amount }
    });
  }
  const existingSession = cart.paymentCollection?.paymentSessions?.find(
    (s) => s.paymentProvider.code === provider.code && s.amount === amount
  );
  if (existingSession) {
    const otherSessions = cart.paymentCollection.paymentSessions.filter(
      (s) => s.id !== existingSession.id && s.isSelected
    );
    for (const session of otherSessions) {
      await sudoContext.query.PaymentSession.updateOne({
        where: { id: session.id },
        data: { isSelected: false }
      });
    }
    await sudoContext.query.PaymentSession.updateOne({
      where: { id: existingSession.id },
      data: { isSelected: true }
    });
    return await sudoContext.query.PaymentSession.findOne({
      where: { id: existingSession.id },
      query: `
        id
        data
        amount
        isInitiated
        isSelected
        paymentProvider {
          id
          code
        }
      `
    });
  }
  const normalizedCurrency = currency.toLowerCase();
  const isManualProvider = provider.code === "pp_system_default";
  let sessionData = { providerCode: provider.code };
  if (!isManualProvider) {
    const createdSessionData = await createPayment({
      provider,
      cart,
      amount,
      currency: normalizedCurrency
    });
    sessionData = {
      ...createdSessionData,
      providerCode: provider.code
    };
  }
  const existingSelectedSessions = cart.paymentCollection.paymentSessions?.filter(
    (s) => s.isSelected
  ) || [];
  for (const session of existingSelectedSessions) {
    await sudoContext.query.PaymentSession.updateOne({
      where: { id: session.id },
      data: { isSelected: false }
    });
  }
  const newSession = await sudoContext.query.PaymentSession.createOne({
    data: {
      paymentCollection: { connect: { id: cart.paymentCollection.id } },
      paymentProvider: { connect: { id: provider.id } },
      amount,
      isSelected: true,
      isInitiated: true,
      data: sessionData
    },
    query: `
      id
      data
      amount
      isInitiated
      isSelected
      paymentProvider {
        id
        code
      }
    `
  });
  return newSession;
}

// features/keystone/mutations/completeActiveCart.ts
async function completeActiveCart(root, { cartId, paymentSessionId }, context) {
  const sudoContext = context.sudo();
  await assertCanAccessCart(context, cartId, "write");
  const cart = await sudoContext.query.Cart.findOne({
    where: { id: cartId },
    query: `
      id
      orderType
      subtotal
      email
      customerName
      customerPhone
      deliveryAddress
      deliveryAddress2
      deliveryCity
      deliveryState
      deliveryZip
      deliveryCountryCode
      tipPercent
      user { id }
      paymentCollection {
        id
        amount
        paymentSessions {
          id
          isSelected
          isInitiated
          amount
          data
          paymentProvider {
            id
            code
            capturePaymentFunction
            getPaymentStatusFunction
          }
        }
      }
      items {
        id
        thumbnail
        quantity
        specialInstructions
        menuItem {
          id
          name
          price
          thumbnail
        }
        modifiers {
          id
          name
          priceAdjustment
        }
      }
    `
  });
  if (!cart) throw new Error("Cart not found");
  if (!cart.items?.length) throw new Error("Cart is empty");
  const selectedSession = paymentSessionId ? cart.paymentCollection?.paymentSessions?.find(
    (session) => session.id === paymentSessionId
  ) : cart.paymentCollection?.paymentSessions?.find((session) => session.isSelected);
  if (!selectedSession) {
    throw new Error("No selected payment session found for this cart.");
  }
  const sessionData = selectedSession.data || {};
  const paymentData = selectedSession.data || null;
  const providerCode = selectedSession.paymentProvider?.code || sessionData?.providerCode;
  const providerPaymentId = sessionData?.paymentIntentId || sessionData?.orderId;
  const paymentProvider = selectedSession.paymentProvider;
  if (!paymentProvider) {
    throw new Error("Selected payment session is missing payment provider information.");
  }
  const isManual = providerCode === "pp_system_default";
  let paymentResult = {
    status: "manual_pending",
    paymentIntentId: null
  };
  if (!isManual) {
    if (!providerPaymentId) {
      throw new Error("Selected payment session is missing provider payment data.");
    }
    const status = await getPaymentStatus({
      provider: paymentProvider,
      paymentId: providerPaymentId
    });
    if (status.status === "succeeded") {
      paymentResult = { status: "succeeded", paymentIntentId: providerPaymentId };
    } else if (status.status === "requires_capture") {
      const captured = await capturePayment2({
        provider: paymentProvider,
        paymentId: providerPaymentId
      });
      paymentResult = {
        status: captured.status === "succeeded" ? "succeeded" : "failed",
        paymentIntentId: providerPaymentId
      };
    } else {
      throw new Error(`Payment not successful. Status: ${status.status}`);
    }
    if (paymentResult.status === "failed") {
      throw new Error("Payment capture failed");
    }
  }
  const settings = await getStoreDeliverySettings(context);
  const currencyCode = settings?.currencyCode || "USD";
  const subtotal = cart.subtotal || 0;
  assertDeliveryAddressComplete({
    orderType: cart.orderType,
    deliveryAddress: cart.deliveryAddress,
    deliveryCity: cart.deliveryCity,
    deliveryCountryCode: cart.deliveryCountryCode,
    deliveryZip: cart.deliveryZip
  });
  assertDeliveryAddressEligible({
    orderType: cart.orderType,
    storeSettings: settings,
    deliveryCountryCode: cart.deliveryCountryCode,
    deliveryZip: cart.deliveryZip
  });
  const { tax, tip, pickupDiscount, deliveryFee, total, deliveryMinimumNotMet } = calculateRestaurantTotals({
    subtotal,
    orderType: cart.orderType,
    tipPercent: cart.tipPercent,
    deliveryFee: settings?.deliveryFee,
    deliveryMinimum: settings?.deliveryMinimum,
    pickupDiscountPercent: settings?.pickupDiscount,
    taxRate: settings?.taxRate,
    currencyCode
  });
  if (deliveryMinimumNotMet) {
    throw new Error(`Delivery orders require a minimum subtotal of ${settings?.deliveryMinimum || "0.00"}.`);
  }
  if (cart.paymentCollection?.id && (cart.paymentCollection.amount || 0) !== total) {
    await sudoContext.query.PaymentCollection.updateOne({
      where: { id: cart.paymentCollection.id },
      data: { amount: total }
    });
  }
  const orderTypeMap = {
    pickup: "takeout",
    delivery: "delivery"
  };
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const customerId = cart.user?.id;
  const secretKey = !customerId ? require("crypto").randomBytes(32).toString("hex") : void 0;
  const isDeliveryOrder2 = cart.orderType === "delivery";
  if (selectedSession.amount !== total) {
    if (!isManual) {
      throw new Error("Cart total changed. Please return to payment and confirm your payment method again.");
    }
    await sudoContext.query.PaymentSession.updateOne({
      where: { id: selectedSession.id },
      data: { amount: total }
    });
  }
  const order = await sudoContext.query.RestaurantOrder.createOne({
    data: {
      orderNumber,
      orderType: orderTypeMap[cart.orderType || "pickup"] || "takeout",
      orderSource: "online",
      status: isManual ? "open" : "sent_to_kitchen",
      guestCount: 1,
      subtotal,
      tax,
      tip,
      discount: pickupDiscount,
      total,
      currencyCode,
      customer: customerId ? { connect: { id: customerId } } : void 0,
      customerName: cart.customerName || "",
      customerEmail: cart.email || "",
      customerPhone: cart.customerPhone || "",
      deliveryAddress: isDeliveryOrder2 ? cart.deliveryAddress || void 0 : void 0,
      deliveryAddress2: isDeliveryOrder2 ? cart.deliveryAddress2 || void 0 : void 0,
      deliveryCity: isDeliveryOrder2 ? cart.deliveryCity || void 0 : void 0,
      deliveryState: isDeliveryOrder2 ? cart.deliveryState || void 0 : void 0,
      deliveryZip: isDeliveryOrder2 ? cart.deliveryZip || void 0 : void 0,
      deliveryCountryCode: isDeliveryOrder2 ? cart.deliveryCountryCode || void 0 : void 0,
      secretKey
    },
    query: "id orderNumber secretKey status"
  });
  for (const item of cart.items) {
    const modTotal = item.modifiers?.reduce(
      (s, m) => s + (m.priceAdjustment || 0),
      0
    ) || 0;
    const unitPrice = (item.menuItem?.price || 0) + modTotal;
    await sudoContext.query.OrderItem.createOne({
      data: {
        quantity: item.quantity,
        price: Math.round(unitPrice),
        specialInstructions: item.specialInstructions || "",
        order: { connect: { id: order.id } },
        menuItem: { connect: { id: item.menuItem.id } },
        appliedModifiers: item.modifiers?.length ? { connect: item.modifiers.map((m) => ({ id: m.id })) } : void 0
      }
    });
  }
  if (isKitchenActiveOrderStatus(order.status)) {
    await syncKitchenTicketsForOrder(order.id, context);
  }
  const paymentMethodMap = {
    pp_stripe_stripe: "credit_card",
    pp_paypal_paypal: "paypal",
    pp_system_default: "cash"
  };
  const payment = await sudoContext.query.Payment.createOne({
    data: {
      amount: total,
      status: paymentResult.status === "succeeded" ? "succeeded" : "pending",
      paymentMethod: paymentMethodMap[providerCode || "pp_system_default"] || "cash",
      currencyCode,
      tipAmount: tip,
      providerPaymentId: paymentResult.paymentIntentId || void 0,
      data: paymentData || {},
      processedAt: paymentResult.status === "succeeded" ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
      order: { connect: { id: order.id } },
      paymentProvider: { connect: { id: paymentProvider.id } }
    }
  });
  if (cart.paymentCollection?.id) {
    await sudoContext.query.PaymentCollection.updateOne({
      where: { id: cart.paymentCollection.id },
      data: {
        payments: { connect: [{ id: payment.id }] }
      }
    });
  }
  await sudoContext.query.Cart.updateOne({
    where: { id: cartId },
    data: {
      order: { connect: { id: order.id } }
    }
  });
  return await sudoContext.query.RestaurantOrder.findOne({
    where: { id: order.id },
    query: "id orderNumber secretKey status"
  });
}

// features/keystone/mutations/activeCart.ts
async function activeCart(root, { cartId }, context) {
  const sudoContext = context.sudo();
  if (!cartId) {
    throw new Error("Cart ID is required");
  }
  try {
    await assertCanAccessCart(context, cartId, "read");
  } catch (error) {
    if (error instanceof Error && (error.message === "Cart not found" || error.message === "Access denied")) {
      return null;
    }
    throw error;
  }
  const cart = await sudoContext.query.Cart.findOne({
    where: { id: cartId },
    query: `
      id
      orderType
      subtotal
      email
      customerName
      customerPhone
      deliveryAddress
      deliveryAddress2
      deliveryCity
      deliveryState
      deliveryZip
      deliveryCountryCode
      tipPercent
      items {
        id
        thumbnail
        quantity
        specialInstructions
        menuItem {
          id
          name
          price
          thumbnail
        }
        modifiers {
          id
          name
          priceAdjustment
        }
      }
      paymentCollection {
        id
        paymentSessions {
          id
          isSelected
          isInitiated
          amount
          data
          paymentProvider {
            id
            code
          }
        }
      }
      order {
        id
      }
    `
  });
  if (!cart) {
    return null;
  }
  const settings = await sudoContext.query.StoreSettings.findOne({
    where: { id: "1" },
    query: `currencyCode`
  });
  return {
    ...cart,
    currencyCode: settings?.currencyCode || "USD"
  };
}

// features/keystone/mutations/updateActiveCart.ts
async function updateActiveCart(root, { cartId, data }, context) {
  const sudoContext = context.sudo();
  await assertCanAccessCart(context, cartId, "write");
  const normalizedData = normalizeDeliveryFields(data);
  const cart = await sudoContext.query.Cart.findOne({
    where: { id: cartId },
    query: `
      id
      orderType
      deliveryAddress
      deliveryCity
      deliveryCountryCode
      deliveryZip
    `
  });
  const storeSettings = await getStoreDeliverySettings(context);
  const nextOrderType = normalizedData.orderType ?? cart?.orderType;
  assertDeliveryModeAllowed({
    orderType: nextOrderType,
    storeSettings
  });
  const isUpdatingDeliveryAddress = "deliveryAddress" in normalizedData || "deliveryAddress2" in normalizedData || "deliveryCity" in normalizedData || "deliveryState" in normalizedData || "deliveryZip" in normalizedData || "deliveryCountryCode" in normalizedData;
  if (isUpdatingDeliveryAddress) {
    assertDeliveryAddressComplete({
      orderType: nextOrderType,
      deliveryAddress: normalizedData.deliveryAddress ?? cart?.deliveryAddress,
      deliveryCity: normalizedData.deliveryCity ?? cart?.deliveryCity,
      deliveryCountryCode: normalizedData.deliveryCountryCode ?? cart?.deliveryCountryCode,
      deliveryZip: normalizedData.deliveryZip ?? cart?.deliveryZip
    });
    assertDeliveryAddressEligible({
      orderType: nextOrderType,
      storeSettings,
      deliveryCountryCode: normalizedData.deliveryCountryCode ?? cart?.deliveryCountryCode,
      deliveryZip: normalizedData.deliveryZip ?? cart?.deliveryZip
    });
  }
  return await sudoContext.db.Cart.updateOne({
    where: { id: cartId },
    data: normalizedData
  });
}

// features/keystone/mutations/updateCartItemQuantity.ts
async function updateCartItemQuantity(root, { cartItemId, quantity }, context) {
  const sudoContext = context.sudo();
  const cartItem = await assertCanAccessCartItem(context, cartItemId, "write");
  await sudoContext.db.CartItem.updateOne({
    where: { id: cartItemId },
    data: { quantity }
  });
  return await sudoContext.db.Cart.findOne({
    where: { id: cartItem.cart.id }
  });
}

// features/keystone/mutations/removeCartItem.ts
async function removeCartItem(root, { cartItemId }, context) {
  const sudoContext = context.sudo();
  const cartItem = await assertCanAccessCartItem(context, cartItemId, "write");
  const cartId = cartItem.cart.id;
  await sudoContext.db.CartItem.deleteOne({
    where: { id: cartItemId }
  });
  return await sudoContext.db.Cart.findOne({
    where: { id: cartId }
  });
}

// features/keystone/mutations/getCustomerOrder.ts
async function getCustomerOrder(root, { orderId, secretKey }, context) {
  const sudoContext = context.sudo();
  const sessionUserId = context.session?.itemId;
  const order = await sudoContext.query.RestaurantOrder.findOne({
    where: { id: orderId },
    query: `
      id
      orderNumber
      orderType
      orderSource
      status
      guestCount
      specialInstructions
      subtotal
      tax
      tip
      discount
      total
      customerName
      customerEmail
      customerPhone
      deliveryAddress
      deliveryAddress2
      deliveryCity
      deliveryState
      deliveryZip
      deliveryCountryCode
      secretKey
      createdAt
      updatedAt
      customer {
        id
      }
      orderItems {
        id
        thumbnail
        quantity
        unitPrice
        totalPrice
        specialInstructions
        menuItem {
          id
          name
          price
          thumbnail
        }
        modifiers: appliedModifiers {
          id
          name
          priceAdjustment
        }
      }
      payments {
        id
        amount
        paymentMethod
        status
        createdAt
      }
    `
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (secretKey) {
    if (order.secretKey !== secretKey) {
      throw new Error("Invalid secret key");
    }
    return order;
  }
  if (!sessionUserId) {
    throw new Error("Not authenticated");
  }
  if (order.customer?.id === sessionUserId) {
    return order;
  }
  throw new Error("Order not found");
}

// features/keystone/mutations/getCustomerOrders.ts
async function getCustomerOrders(root, { limit = 10, offset = 0 }, context) {
  const sessionUserId = context.session?.itemId;
  if (!sessionUserId) {
    throw new Error("Not authenticated");
  }
  const sudoContext = context.sudo();
  const orders = await sudoContext.query.RestaurantOrder.findMany({
    where: {
      customer: { id: { equals: sessionUserId } }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    query: `
      id
      orderNumber
      orderType
      status
      total
      createdAt
      customerName
      orderItems {
        id
        quantity
        price
        menuItem {
          id
          name
        }
      }
    `
  });
  return orders;
}

// features/keystone/queries/activeCartPaymentProviders.ts
async function activeCartPaymentProviders(root, _args, context) {
  const providers = await context.sudo().query.PaymentProvider.findMany({
    where: {
      isInstalled: { equals: true }
    },
    query: `
      id
      name
      code
      isInstalled
    `
  });
  return providers;
}

// features/keystone/mutations/tableManagement.ts
async function transferTable(root, args, context) {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized" };
  }
  const { orderId, fromTableId, toTableId } = args;
  const sudo = context.sudo();
  try {
    await sudo.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: {
        tables: {
          disconnect: [{ id: fromTableId }],
          connect: [{ id: toTableId }]
        }
      }
    });
    const fromTableOrders = await sudo.query.RestaurantOrder.count({
      where: {
        tables: { some: { id: { equals: fromTableId } } },
        status: { notIn: ["completed", "cancelled"] }
      }
    });
    if (fromTableOrders === 0) {
      await sudo.db.Table.updateOne({
        where: { id: fromTableId },
        data: { status: "cleaning" }
      });
    }
    await sudo.db.Table.updateOne({
      where: { id: toTableId },
      data: { status: "occupied" }
    });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function combineTables(root, args, context) {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized" };
  }
  const { orderId, tableIds } = args;
  const sudo = context.sudo();
  try {
    await sudo.db.RestaurantOrder.updateOne({
      where: { id: orderId },
      data: {
        tables: {
          connect: tableIds.map((id) => ({ id }))
        }
      }
    });
    await Promise.all(
      tableIds.map(
        (id) => sudo.db.Table.updateOne({
          where: { id },
          data: { status: "occupied" }
        })
      )
    );
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/courseManagement.ts
async function fireCourse(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized" };
  }
  const { courseId } = args;
  const sudo = context.sudo();
  try {
    await sudo.db.OrderCourse.updateOne({
      where: { id: courseId },
      data: {
        status: "fired",
        fireTime: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    const course = await sudo.query.OrderCourse.findOne({
      where: { id: courseId },
      query: "orderItems { id }"
    });
    if (course?.orderItems?.length) {
      await Promise.all(
        course.orderItems.map(
          (item) => sudo.db.OrderItem.updateOne({
            where: { id: item.id },
            data: { sentToKitchen: (/* @__PURE__ */ new Date()).toISOString() }
          })
        )
      );
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function recallCourse(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized" };
  }
  const { courseId } = args;
  const sudo = context.sudo();
  try {
    await sudo.db.OrderCourse.updateOne({
      where: { id: courseId },
      data: {
        status: "pending",
        fireTime: null
      }
    });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/kdsTickets.ts
async function syncKitchenTickets(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized", created: 0, updated: 0 };
  }
  try {
    const result = await syncKitchenTicketsForActiveOrders(context);
    return { success: true, error: null, created: result.created, updated: result.updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      created: 0,
      updated: 0
    };
  }
}
async function updateKitchenTicketStatus(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized" };
  }
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sudo = context.sudo();
    const ticket = await sudo.query.KitchenTicket.findOne({
      where: { id: args.ticketId },
      query: "id order { id } station { name }"
    });
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }
    if (args.status === "served" && isExpediterStation(ticket.station?.name) && ticket.order?.id) {
      const siblingTickets = await sudo.query.KitchenTicket.findMany({
        where: {
          order: { id: { equals: ticket.order.id } },
          status: { in: ["new", "in_progress"] }
        },
        query: "id status station { name }"
      });
      const blockingPrep = siblingTickets.filter((t) => t.id !== ticket.id && !isExpediterStation(t.station?.name));
      if (blockingPrep.length > 0) {
        const stations = blockingPrep.map((t) => t.station?.name).filter(Boolean).join(", ");
        return {
          success: false,
          error: stations ? `Prep stations still working: ${stations}` : "Prep tickets must be completed before expediter can bump served"
        };
      }
    }
    await sudo.db.KitchenTicket.updateOne({
      where: { id: args.ticketId },
      data: {
        status: args.status,
        completedAt: args.status === "ready" ? now : args.status === "in_progress" ? null : void 0,
        servedAt: args.status === "served" ? now : void 0
      }
    });
    if (ticket.order?.id) {
      await reconcileRestaurantOrderStatus(ticket.order.id, context);
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function fulfillKitchenTicketItem(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized" };
  }
  try {
    const sudo = context.sudo();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const ticket = await sudo.query.KitchenTicket.findOne({
      where: { id: args.ticketId },
      query: "id items order { id }"
    });
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }
    const items = (ticket.items || []).map((item) => {
      if (item.id !== args.itemId) return item;
      return {
        ...item,
        status: args.fulfilled ? "fulfilled" : "in_progress",
        fulfilledAt: args.fulfilled ? now : null
      };
    });
    const allFulfilled = items.length > 0 && items.every((i) => i.status === "fulfilled");
    await sudo.db.KitchenTicket.updateOne({
      where: { id: args.ticketId },
      data: {
        items,
        status: allFulfilled ? "ready" : "in_progress",
        completedAt: allFulfilled ? now : null
      }
    });
    if (ticket.order?.id) {
      await reconcileRestaurantOrderStatus(ticket.order.id, context);
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/handlePaymentProviderWebhook.ts
function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    normalized[String(key).toLowerCase()] = Array.isArray(value) ? String(value[0] || "") : String(value ?? "");
  }
  return normalized;
}
function getCandidateProviderPaymentIds(type, resource) {
  const ids = /* @__PURE__ */ new Set();
  const add = (value) => {
    if (typeof value === "string" && value.trim()) ids.add(value.trim());
  };
  add(resource?.id);
  add(resource?.payment_intent);
  add(resource?.supplementary_data?.related_ids?.order_id);
  add(resource?.supplementary_data?.related_ids?.capture_id);
  if (type.startsWith("PAYMENT.CAPTURE.")) {
    add(resource?.supplementary_data?.related_ids?.order_id);
    add(resource?.id);
  }
  return Array.from(ids);
}
async function findPaymentByProviderIds(providerPaymentIds, context) {
  const sudo = context.sudo();
  for (const providerPaymentId of providerPaymentIds) {
    const payments = await sudo.query.Payment.findMany({
      where: { providerPaymentId: { equals: providerPaymentId } },
      query: "id status data order { id status }",
      take: 1
    });
    if (payments.length > 0) {
      return { payment: payments[0], providerPaymentId };
    }
  }
  return null;
}
async function handlePaymentProviderWebhook(root, { providerCode, event, headers }, context) {
  const sudoContext = context.sudo();
  if (!providerCode || !/^[a-z0-9_\-]+$/i.test(providerCode)) {
    throw new Error("Invalid provider code");
  }
  if (!event || typeof event !== "object") {
    throw new Error("Webhook event payload is required");
  }
  const normalizedHeaders = normalizeHeaders(headers);
  const providers = await sudoContext.query.PaymentProvider.findMany({
    where: { code: { equals: providerCode } },
    query: `
      id
      code
      isInstalled
      createPaymentFunction
      capturePaymentFunction
      refundPaymentFunction
      getPaymentStatusFunction
      generatePaymentLinkFunction
      handleWebhookFunction
      credentials
      metadata
    `,
    take: 1
  });
  const provider = providers[0];
  if (!provider || !provider.isInstalled) {
    throw new Error(`Payment provider ${providerCode} not found or not installed`);
  }
  if (!provider.handleWebhookFunction || provider.handleWebhookFunction === "manual") {
    throw new Error(`Provider ${providerCode} does not support authenticated webhook handling`);
  }
  const parsed = await handleWebhook({ provider, event, headers: normalizedHeaders });
  if (!parsed?.isValid || !parsed?.type) {
    throw new Error("Webhook verification failed");
  }
  const type = String(parsed.type);
  const resource = parsed.resource || {};
  const candidateIds = getCandidateProviderPaymentIds(type, resource);
  const matched = candidateIds.length > 0 ? await findPaymentByProviderIds(candidateIds, context) : null;
  if (!matched) {
    return { success: true, error: null };
  }
  const { payment } = matched;
  if (["payment_intent.succeeded", "charge.succeeded", "CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"].includes(type)) {
    await sudoContext.db.Payment.updateOne({
      where: { id: payment.id },
      data: {
        status: "succeeded",
        processedAt: (/* @__PURE__ */ new Date()).toISOString(),
        errorMessage: null,
        data: {
          ...payment.data || {},
          webhookType: type,
          webhookResourceId: resource.id || null,
          chargeId: resource.latest_charge || resource.id || null
        }
      }
    });
    if (payment.order?.id && !["completed", "cancelled"].includes(payment.order.status || "")) {
      await sudoContext.db.RestaurantOrder.updateOne({
        where: { id: payment.order.id },
        data: {
          status: "sent_to_kitchen"
        }
      });
    }
  } else if (["payment_intent.payment_failed", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED"].includes(type)) {
    await sudoContext.db.Payment.updateOne({
      where: { id: payment.id },
      data: {
        status: "failed",
        errorMessage: resource.last_payment_error?.message || resource.status_details?.reason || "Payment failed",
        data: {
          ...payment.data || {},
          webhookType: type,
          webhookResourceId: resource.id || null
        }
      }
    });
  } else if (["payment_intent.canceled", "PAYMENT.CAPTURE.REVERSED", "CHECKOUT.ORDER.VOIDED"].includes(type)) {
    await sudoContext.db.Payment.updateOne({
      where: { id: payment.id },
      data: {
        status: "cancelled",
        data: {
          ...payment.data || {},
          webhookType: type,
          webhookResourceId: resource.id || null
        }
      }
    });
  }
  return { success: true, error: null };
}

// features/keystone/mutations/createPOSOrder.ts
function generateOrderNumber() {
  const now = /* @__PURE__ */ new Date();
  return `${now.toISOString().slice(2, 10).replace(/-/g, "")}-${now.getTime().toString().slice(-4)}`;
}
function getCourseType(courseNumber) {
  if (courseNumber === 1) return "appetizers";
  if (courseNumber === 2) return "mains";
  if (courseNumber === 3) return "desserts";
  return "mains";
}
async function createPOSOrder(root, args, context) {
  if (!permissions.canManageOrders({ session: context.session })) {
    throw new Error("Not authorized to create POS orders");
  }
  const orderType = args.orderType || "dine_in";
  const items = (args.items || []).filter((item) => item?.menuItemId && (item.quantity || 0) > 0);
  const tableIds = args.tableIds || [];
  if (items.length === 0) {
    throw new Error("Order must include at least one item");
  }
  if (orderType === "dine_in" && tableIds.length === 0) {
    throw new Error("Dine-in orders require at least one table");
  }
  const sudo = context.sudo();
  const [storeSettings, menuItems] = await Promise.all([
    sudo.query.StoreSettings.findOne({
      where: { id: "1" },
      query: "currencyCode taxRate"
    }),
    sudo.query.MenuItem.findMany({
      where: { id: { in: items.map((item) => item.menuItemId) } },
      query: "id price available"
    })
  ]);
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
  const normalizedItems = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item not found: ${item.menuItemId}`);
    }
    if (!menuItem.available) {
      throw new Error("One or more selected menu items are unavailable");
    }
    return {
      menuItemId: item.menuItemId,
      quantity: Math.max(1, item.quantity),
      courseNumber: item.courseNumber || 1,
      price: Number(menuItem.price || 0)
    };
  });
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currencyCode = storeSettings?.currencyCode || "USD";
  const { tax, total } = calculateRestaurantTotals({
    subtotal,
    orderType,
    taxRate: storeSettings?.taxRate,
    currencyCode
  });
  const order = await sudo.db.RestaurantOrder.createOne({
    data: {
      orderNumber: generateOrderNumber(),
      orderType,
      orderSource: "pos",
      status: "open",
      guestCount: Math.max(1, args.guestCount || 1),
      subtotal,
      tax,
      total,
      isUrgent: Boolean(args.isUrgent),
      specialInstructions: args.specialInstructions || "",
      currencyCode,
      tables: tableIds.length ? { connect: tableIds.map((id) => ({ id })) } : void 0,
      server: context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0,
      createdBy: context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0
    }
  });
  const courseMap = /* @__PURE__ */ new Map();
  for (const item of normalizedItems) {
    if (!courseMap.has(item.courseNumber)) {
      const course = await sudo.db.OrderCourse.createOne({
        data: {
          order: { connect: { id: order.id } },
          courseNumber: item.courseNumber,
          courseType: getCourseType(item.courseNumber),
          status: "pending"
        }
      });
      courseMap.set(item.courseNumber, course.id);
    }
    await sudo.db.OrderItem.createOne({
      data: {
        order: { connect: { id: order.id } },
        course: { connect: { id: courseMap.get(item.courseNumber) } },
        menuItem: { connect: { id: item.menuItemId } },
        quantity: item.quantity,
        price: item.price,
        courseNumber: item.courseNumber
      }
    });
  }
  return sudo.query.RestaurantOrder.findOne({
    where: { id: order.id },
    query: "id orderNumber status subtotal tax total"
  });
}

// features/keystone/mutations/addServiceFloorItem.ts
function generateDineInOrderNumber() {
  return `DIN-${Date.now().toString(36).toUpperCase()}`;
}
function getCourseType2(courseNumber) {
  if (courseNumber === 1) return "appetizers";
  if (courseNumber === 2) return "mains";
  if (courseNumber === 3) return "desserts";
  return "mains";
}
async function recalculateOrderTotals2(orderId, context) {
  const sudo = context.sudo();
  const [settings, order] = await Promise.all([
    getStoreDeliverySettings(context),
    sudo.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: `
        id
        orderType
        currencyCode
        tip
        discount
        orderItems { id quantity price }
      `
    })
  ]);
  if (!order) throw new Error("Order not found while recalculating totals");
  const subtotal = (order.orderItems || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const { tax } = calculateRestaurantTotals({
    subtotal,
    orderType: order.orderType || "dine_in",
    taxRate: settings?.taxRate,
    currencyCode: settings?.currencyCode || order.currencyCode || "USD"
  });
  const tip = Math.max(0, Number(order.tip || 0));
  const discount = Math.max(0, Number(order.discount || 0));
  const total = Math.max(0, subtotal + tax + tip - discount);
  await sudo.db.RestaurantOrder.updateOne({
    where: { id: orderId },
    data: {
      subtotal,
      tax,
      total,
      currencyCode: settings?.currencyCode || order.currencyCode || "USD"
    }
  });
  return { subtotal, tax, total };
}
async function addServiceFloorItem(root, args, context) {
  if (!permissions.canManageOrders({ session: context.session })) {
    throw new Error("Not authorized to manage service-floor checks");
  }
  const quantity = Math.max(1, Math.floor(Number(args.quantity || 1)));
  const courseNumber = Math.max(1, Math.floor(Number(args.courseNumber || 1)));
  const sudo = context.sudo();
  if (!args.tableId) throw new Error("Table is required");
  if (!args.menuItemId) throw new Error("Menu item is required");
  const [settings, table, menuItem] = await Promise.all([
    getStoreDeliverySettings(context),
    sudo.query.Table.findOne({
      where: { id: args.tableId },
      query: "id tableNumber status"
    }),
    sudo.query.MenuItem.findOne({
      where: { id: args.menuItemId },
      query: "id name price available"
    })
  ]);
  if (!table) throw new Error("Table not found");
  if (!menuItem) throw new Error("Menu item not found");
  if (!menuItem.available) throw new Error(`${menuItem.name || "Selected item"} is unavailable`);
  let orderId = args.orderId || null;
  let order = null;
  if (orderId) {
    order = await sudo.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: "id status orderType tables { id } courses { id courseNumber }"
    });
    if (!order) throw new Error("Active check not found");
  } else {
    const currencyCode = settings?.currencyCode || "USD";
    order = await sudo.db.RestaurantOrder.createOne({
      data: {
        orderNumber: generateDineInOrderNumber(),
        orderType: "dine_in",
        orderSource: "pos",
        status: "open",
        guestCount: 1,
        subtotal: 0,
        tax: 0,
        total: 0,
        currencyCode,
        tables: { connect: [{ id: args.tableId }] },
        server: context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0,
        createdBy: context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0
      }
    });
    orderId = order.id;
    await sudo.db.Table.updateOne({
      where: { id: args.tableId },
      data: { status: "occupied" }
    });
  }
  const existingCourse = (order.courses || []).find((course2) => Number(course2.courseNumber) === courseNumber);
  const course = existingCourse || await sudo.db.OrderCourse.createOne({
    data: {
      order: { connect: { id: orderId } },
      courseNumber,
      courseType: getCourseType2(courseNumber),
      status: "pending"
    }
  });
  if (!orderId) throw new Error("Unable to create or find active order for this table");
  await sudo.db.OrderItem.createOne({
    data: {
      order: { connect: { id: orderId } },
      course: { connect: { id: course.id } },
      menuItem: { connect: { id: args.menuItemId } },
      quantity,
      price: Number(menuItem.price || 0),
      courseNumber,
      seatNumber: args.seatNumber ?? void 0,
      specialInstructions: args.specialInstructions || ""
    }
  });
  await recalculateOrderTotals2(orderId, context);
  const refreshed = await sudo.query.RestaurantOrder.findOne({
    where: { id: orderId },
    query: "id orderNumber status subtotal tax total"
  });
  return refreshed;
}

// features/keystone/mutations/updateServiceFloorItem.ts
function getCourseType3(courseNumber) {
  if (courseNumber === 1) return "appetizers";
  if (courseNumber === 2) return "mains";
  if (courseNumber === 3) return "desserts";
  return "mains";
}
async function recalculateOrderTotals3(orderId, context, voidReason) {
  const sudo = context.sudo();
  const [settings, order] = await Promise.all([
    getStoreDeliverySettings(context),
    sudo.query.RestaurantOrder.findOne({
      where: { id: orderId },
      query: `
        id
        orderType
        currencyCode
        tip
        discount
        specialInstructions
        orderItems { id quantity price }
      `
    })
  ]);
  if (!order) throw new Error("Order not found while recalculating totals");
  const subtotal = (order.orderItems || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const { tax } = calculateRestaurantTotals({
    subtotal,
    orderType: order.orderType || "dine_in",
    taxRate: settings?.taxRate,
    currencyCode: settings?.currencyCode || order.currencyCode || "USD"
  });
  const tip = Math.max(0, Number(order.tip || 0));
  const discount = Math.max(0, Number(order.discount || 0));
  const total = Math.max(0, subtotal + tax + tip - discount);
  const notePatch = voidReason ? order.specialInstructions ? `${order.specialInstructions} | VOID ITEM: ${voidReason}` : `VOID ITEM: ${voidReason}` : order.specialInstructions;
  await sudo.db.RestaurantOrder.updateOne({
    where: { id: orderId },
    data: {
      subtotal,
      tax,
      total,
      currencyCode: settings?.currencyCode || order.currencyCode || "USD",
      specialInstructions: notePatch || ""
    }
  });
  return { subtotal, tax, total };
}
async function getOrCreateCourse(orderId, courseNumber, context) {
  const sudo = context.sudo();
  const courses = await sudo.query.OrderCourse.findMany({
    where: {
      order: { id: { equals: orderId } },
      courseNumber: { equals: courseNumber }
    },
    query: "id courseNumber",
    take: 1
  });
  if (courses[0]) return courses[0];
  return sudo.db.OrderCourse.createOne({
    data: {
      order: { connect: { id: orderId } },
      courseNumber,
      courseType: getCourseType3(courseNumber),
      status: "pending"
    }
  });
}
async function updateServiceFloorItem(root, args, context) {
  if (!permissions.canManageOrders({ session: context.session })) {
    throw new Error("Not authorized to manage service-floor checks");
  }
  if (!args.orderItemId) throw new Error("Order item is required");
  const sudo = context.sudo();
  const item = await sudo.query.OrderItem.findOne({
    where: { id: args.orderItemId },
    query: "id quantity courseNumber order { id status }"
  });
  if (!item?.order?.id) throw new Error("Order item not found");
  const orderId = item.order.id;
  const voidReason = args.voidReason?.trim() || null;
  if (voidReason) {
    await sudo.db.OrderItem.deleteOne({ where: { id: args.orderItemId } });
  } else {
    const quantity = Math.max(1, Math.floor(Number(args.quantity ?? item.quantity ?? 1)));
    const courseNumber = Math.max(1, Math.floor(Number(args.courseNumber ?? item.courseNumber ?? 1)));
    const course = await getOrCreateCourse(orderId, courseNumber, context);
    await sudo.db.OrderItem.updateOne({
      where: { id: args.orderItemId },
      data: {
        quantity,
        courseNumber,
        course: { connect: { id: course.id } },
        seatNumber: args.seatNumber ?? void 0,
        specialInstructions: args.specialInstructions ?? void 0
      }
    });
  }
  await recalculateOrderTotals3(orderId, context, voidReason);
  const refreshed = await sudo.query.RestaurantOrder.findOne({
    where: { id: orderId },
    query: "id orderNumber status subtotal tax total"
  });
  return refreshed;
}

// features/keystone/mutations/serviceFloorTable.ts
var ACTIVE_ORDER_STATUSES2 = ["open", "sent_to_kitchen", "in_progress", "ready", "served"];
async function getActiveOrdersForTable(tableId, context) {
  return context.sudo().query.RestaurantOrder.findMany({
    where: {
      tables: { some: { id: { equals: tableId } } },
      status: { in: ACTIVE_ORDER_STATUSES2 }
    },
    query: "id status orderNumber",
    take: 5
  });
}
async function updateServiceFloorTableStatus(root, args, context) {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized to manage tables" };
  }
  if (!args.tableId) return { success: false, error: "Table is required" };
  if (!["available", "occupied", "reserved", "cleaning"].includes(args.status)) {
    return { success: false, error: "Invalid table status" };
  }
  try {
    const sudo = context.sudo();
    const table = await sudo.query.Table.findOne({
      where: { id: args.tableId },
      query: "id tableNumber status"
    });
    if (!table) return { success: false, error: "Table not found" };
    const activeOrders = await getActiveOrdersForTable(args.tableId, context);
    if (activeOrders.length > 0 && ["available", "cleaning"].includes(args.status)) {
      return {
        success: false,
        error: `Table ${table.tableNumber || ""} has an active check. Close or move the check before marking it ${args.status}.`
      };
    }
    await sudo.db.Table.updateOne({
      where: { id: args.tableId },
      data: { status: args.status }
    });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function updateServiceFloorCheckStatus(root, args, context) {
  if (!permissions.canManageOrders({ session: context.session })) {
    return { success: false, error: "Not authorized to manage checks" };
  }
  if (!args.orderId) return { success: false, error: "Order is required" };
  try {
    const sudo = context.sudo();
    const order = await sudo.query.RestaurantOrder.findOne({
      where: { id: args.orderId },
      query: "id status total payments { id amount status } tables { id } orderItems { id }"
    });
    if (!order) return { success: false, error: "Check not found" };
    let nextStatus = null;
    if (args.action === "send_to_kitchen") {
      if (!order.orderItems?.length) return { success: false, error: "Add at least one item before sending to kitchen" };
      nextStatus = "sent_to_kitchen";
    } else if (args.action === "mark_served") {
      nextStatus = "served";
    } else if (args.action === "close_check") {
      const paid = (order.payments || []).filter((payment) => payment.status === "succeeded").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      if (paid < Number(order.total || 0)) {
        return { success: false, error: "Check cannot be closed until payment is complete" };
      }
      nextStatus = "completed";
    } else if (args.action === "cancel_check") {
      nextStatus = "cancelled";
    } else {
      return { success: false, error: "Invalid check action" };
    }
    await sudo.db.RestaurantOrder.updateOne({
      where: { id: args.orderId },
      data: { status: nextStatus }
    });
    if (["completed", "cancelled"].includes(nextStatus)) {
      for (const table of order.tables || []) {
        const activeOrders = await getActiveOrdersForTable(table.id, context);
        const otherActiveOrders = activeOrders.filter((activeOrder) => activeOrder.id !== order.id);
        if (otherActiveOrders.length === 0) {
          await sudo.db.Table.updateOne({
            where: { id: table.id },
            data: { status: nextStatus === "completed" ? "cleaning" : "available" }
          });
        }
      }
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/waitlistManagement.ts
function normalizePartySize(value) {
  return Math.max(1, Math.floor(Number(value || 1)));
}
function normalizeQuotedWait(value) {
  return Math.max(0, Math.floor(Number(value || 15)));
}
async function createWaitlistEntry(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized to manage waitlist" };
  }
  const customerName = args.customerName?.trim();
  const phoneNumber = args.phoneNumber?.trim();
  if (!customerName) return { success: false, error: "Guest name is required" };
  if (!phoneNumber) return { success: false, error: "Phone number is required" };
  try {
    await context.sudo().db.WaitlistEntry.createOne({
      data: {
        customerName,
        phoneNumber,
        partySize: normalizePartySize(args.partySize),
        quotedWaitTime: normalizeQuotedWait(args.quotedWaitTime),
        notes: args.notes?.trim() || "",
        status: "waiting",
        addedBy: context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0
      }
    });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function updateWaitlistStatus(root, args, context) {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized to manage waitlist" };
  }
  if (!args.entryId) return { success: false, error: "Waitlist entry is required" };
  try {
    const sudo = context.sudo();
    const entry = await sudo.query.WaitlistEntry.findOne({
      where: { id: args.entryId },
      query: "id status partySize customerName"
    });
    if (!entry) return { success: false, error: "Waitlist entry not found" };
    if (["seated", "cancelled", "no_show"].includes(entry.status || "")) {
      return { success: false, error: "This waitlist entry is already closed" };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (args.action === "notify") {
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: { status: "notified", notifiedAt: now }
      });
    } else if (args.action === "seat") {
      if (!args.tableId) return { success: false, error: "Select a table before seating the guest" };
      const table = await sudo.query.Table.findOne({
        where: { id: args.tableId },
        query: "id tableNumber capacity status"
      });
      if (!table) return { success: false, error: "Table not found" };
      if (table.status !== "available") {
        return { success: false, error: `Table ${table.tableNumber || ""} is not available` };
      }
      if (Number(table.capacity || 0) < Number(entry.partySize || 1)) {
        return { success: false, error: "Selected table is too small for this party" };
      }
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: {
          status: "seated",
          seatedAt: now,
          table: { connect: { id: args.tableId } }
        }
      });
      await sudo.db.Table.updateOne({
        where: { id: args.tableId },
        data: { status: "occupied" }
      });
    } else if (args.action === "cancel") {
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: { status: "cancelled" }
      });
    } else if (args.action === "no_show") {
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: { status: "no_show" }
      });
    } else {
      return { success: false, error: "Invalid waitlist action" };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/reservationManagement.ts
var ACTIVE_RESERVATION_STATUSES = ["pending", "confirmed", "seated"];
var TERMINAL_RESERVATION_STATUSES = ["completed", "cancelled", "no_show"];
function minutes(value, fallback = 90) {
  return Math.max(15, Math.floor(Number(value || fallback)));
}
function partySize(value) {
  return Math.max(1, Math.floor(Number(value || 1)));
}
function reservationWindow(dateValue, duration) {
  const start = new Date(dateValue);
  if (Number.isNaN(start.getTime())) throw new Error("Reservation date is invalid");
  const end = new Date(start.getTime() + duration * 6e4);
  return { start, end };
}
async function assertTableAssignable({
  tableId,
  party,
  reservationStart,
  duration,
  reservationId,
  context
}) {
  if (!tableId) return;
  const sudo = context.sudo();
  const table = await sudo.query.Table.findOne({
    where: { id: tableId },
    query: "id tableNumber capacity status"
  });
  if (!table) throw new Error("Assigned table not found");
  if (Number(table.capacity || 0) < party) {
    throw new Error(`Table ${table.tableNumber || ""} is too small for this party`);
  }
  const { start, end } = reservationWindow(reservationStart, duration);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);
  const sameDayReservations = await sudo.query.Reservation.findMany({
    where: {
      assignedTable: { id: { equals: tableId } },
      reservationDate: { gte: dayStart.toISOString(), lte: dayEnd.toISOString() },
      status: { in: ACTIVE_RESERVATION_STATUSES }
    },
    query: "id reservationDate duration status customerName"
  });
  const conflicts = sameDayReservations.filter((reservation) => {
    if (reservationId && reservation.id === reservationId) return false;
    const existingStart = new Date(reservation.reservationDate);
    const existingEnd = new Date(existingStart.getTime() + minutes(reservation.duration) * 6e4);
    return existingStart < end && start < existingEnd;
  });
  if (conflicts.length > 0) {
    throw new Error(`Table ${table.tableNumber || ""} already has a reservation in that time window`);
  }
}
async function upsertReservation(root, args, context) {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized to manage reservations" };
  }
  const customerName = args.customerName?.trim();
  const customerPhone = args.customerPhone?.trim();
  if (!customerName) return { success: false, error: "Customer name is required" };
  if (!customerPhone) return { success: false, error: "Phone number is required" };
  try {
    const normalizedPartySize = partySize(args.partySize);
    const normalizedDuration = minutes(args.duration);
    const status = args.status || "confirmed";
    if (!["pending", "confirmed", "seated", "completed", "cancelled", "no_show"].includes(status)) {
      return { success: false, error: "Invalid reservation status" };
    }
    await assertTableAssignable({
      tableId: args.assignedTableId,
      party: normalizedPartySize,
      reservationStart: args.reservationDate,
      duration: normalizedDuration,
      reservationId: args.reservationId,
      context
    });
    const data = {
      customerName,
      customerPhone,
      customerEmail: args.customerEmail?.trim() || "",
      reservationDate: new Date(args.reservationDate).toISOString(),
      partySize: normalizedPartySize,
      duration: normalizedDuration,
      status,
      specialRequests: args.specialRequests?.trim() || ""
    };
    if (args.assignedTableId) {
      data.assignedTable = { connect: { id: args.assignedTableId } };
    } else if (args.reservationId) {
      data.assignedTable = { disconnect: true };
    }
    if (args.reservationId) {
      await context.sudo().db.Reservation.updateOne({
        where: { id: args.reservationId },
        data
      });
    } else {
      await context.sudo().db.Reservation.createOne({ data });
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function updateReservationStatus(root, args, context) {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized to manage reservations" };
  }
  if (!args.reservationId) return { success: false, error: "Reservation is required" };
  try {
    const sudo = context.sudo();
    const reservation = await sudo.query.Reservation.findOne({
      where: { id: args.reservationId },
      query: "id status partySize duration reservationDate assignedTable { id tableNumber status }"
    });
    if (!reservation) return { success: false, error: "Reservation not found" };
    if (TERMINAL_RESERVATION_STATUSES.includes(reservation.status || "")) {
      return { success: false, error: "This reservation is already closed" };
    }
    if (args.action === "pending") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "pending" } });
    } else if (args.action === "confirm") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "confirmed" } });
    } else if (args.action === "seat") {
      const tableId = args.tableId || reservation.assignedTable?.id;
      if (!tableId) return { success: false, error: "Assign a table before seating" };
      await assertTableAssignable({
        tableId,
        party: partySize(reservation.partySize),
        reservationStart: reservation.reservationDate,
        duration: minutes(reservation.duration),
        reservationId: reservation.id,
        context
      });
      const table = await sudo.query.Table.findOne({ where: { id: tableId }, query: "id status tableNumber" });
      if (!table) return { success: false, error: "Table not found" };
      if (!["available", "reserved"].includes(table.status || "")) {
        return { success: false, error: `Table ${table.tableNumber || ""} is not available to seat` };
      }
      await sudo.db.Reservation.updateOne({
        where: { id: args.reservationId },
        data: {
          status: "seated",
          assignedTable: { connect: { id: tableId } }
        }
      });
      await sudo.db.Table.updateOne({ where: { id: tableId }, data: { status: "occupied" } });
    } else if (args.action === "complete") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "completed" } });
      if (reservation.assignedTable?.id && reservation.assignedTable.status === "occupied") {
        await sudo.db.Table.updateOne({ where: { id: reservation.assignedTable.id }, data: { status: "cleaning" } });
      }
    } else if (args.action === "cancel") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "cancelled" } });
      if (reservation.assignedTable?.id && reservation.assignedTable.status === "reserved") {
        await sudo.db.Table.updateOne({ where: { id: reservation.assignedTable.id }, data: { status: "available" } });
      }
    } else if (args.action === "no_show") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "no_show" } });
      if (reservation.assignedTable?.id && reservation.assignedTable.status === "reserved") {
        await sudo.db.Table.updateOne({ where: { id: reservation.assignedTable.id }, data: { status: "available" } });
      }
    } else {
      return { success: false, error: "Invalid reservation action" };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/shiftManagement.ts
var VALID_ROLES = ["server", "bartender", "host", "busser", "cook", "dishwasher", "manager"];
var OPEN_SHIFT_STATUSES = ["scheduled", "started"];
function parseShiftWindow(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime())) throw new Error("Shift start time is invalid");
  if (Number.isNaN(end.getTime())) throw new Error("Shift end time is invalid");
  if (end <= start) throw new Error("Shift end time must be after start time");
  return { start, end };
}
async function assertNoStaffOverlap({
  staffId,
  startTime,
  endTime,
  shiftId,
  context
}) {
  if (!staffId) return;
  const { start, end } = parseShiftWindow(startTime, endTime);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);
  const shifts = await context.sudo().query.Shift.findMany({
    where: {
      staff: { id: { equals: staffId } },
      startTime: { gte: dayStart.toISOString(), lte: dayEnd.toISOString() },
      status: { in: OPEN_SHIFT_STATUSES }
    },
    query: "id startTime endTime status"
  });
  const overlapping = shifts.filter((shift) => {
    if (shiftId && shift.id === shiftId) return false;
    const existingStart = new Date(shift.startTime);
    const existingEnd = new Date(shift.endTime);
    return existingStart < end && start < existingEnd;
  });
  if (overlapping.length > 0) {
    throw new Error("This staff member already has an overlapping open shift");
  }
}
async function upsertShift(root, args, context) {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage shifts" };
  }
  if (!VALID_ROLES.includes(args.role)) return { success: false, error: "Invalid shift role" };
  try {
    parseShiftWindow(args.startTime, args.endTime);
    if (args.staffId) {
      const staff = await context.sudo().query.User.findOne({
        where: { id: args.staffId },
        query: "id name isActive"
      });
      if (!staff) return { success: false, error: "Staff member not found" };
      if (staff.isActive === false) return { success: false, error: "Cannot schedule an inactive staff member" };
    }
    await assertNoStaffOverlap({
      staffId: args.staffId,
      startTime: args.startTime,
      endTime: args.endTime,
      shiftId: args.shiftId,
      context
    });
    const data = {
      startTime: new Date(args.startTime).toISOString(),
      endTime: new Date(args.endTime).toISOString(),
      role: args.role,
      hourlyRate: args.hourlyRate || void 0,
      staff: args.staffId ? { connect: { id: args.staffId } } : { disconnect: true }
    };
    if (args.shiftId) {
      await context.sudo().db.Shift.updateOne({ where: { id: args.shiftId }, data });
    } else {
      await context.sudo().db.Shift.createOne({ data: { ...data, status: "scheduled" } });
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function updateShiftStatus(root, args, context) {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage shifts" };
  }
  if (!args.shiftId) return { success: false, error: "Shift is required" };
  try {
    const sudo = context.sudo();
    const shift = await sudo.query.Shift.findOne({
      where: { id: args.shiftId },
      query: "id status clockIn clockOut"
    });
    if (!shift) return { success: false, error: "Shift not found" };
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (args.action === "start") {
      if (shift.status !== "scheduled") return { success: false, error: "Only scheduled shifts can be started" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "started", clockIn: now } });
    } else if (args.action === "complete") {
      if (shift.status !== "started") return { success: false, error: "Only started shifts can be completed" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "completed", clockOut: now } });
    } else if (args.action === "no_show") {
      if (shift.status !== "scheduled") return { success: false, error: "Only scheduled shifts can be marked no-show" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "no_show" } });
    } else if (args.action === "cancel") {
      if (!["scheduled", "started"].includes(shift.status || "")) return { success: false, error: "This shift is already closed" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "called_out" } });
    } else {
      return { success: false, error: "Invalid shift action" };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/tipManagement.ts
var ROLE_PERCENTAGES = {
  server: 60,
  bartender: 20,
  busser: 10,
  host: 10
};
function dollarsToCents(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}
function getBusinessDayWindow(date) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) throw new Error("Business date is invalid");
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function calculateHours(entry) {
  if (typeof entry.hoursWorked === "number") return entry.hoursWorked;
  if (!entry.clockIn || !entry.clockOut) return 0;
  const start = new Date(entry.clockIn);
  const end = new Date(entry.clockOut);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 36e5 * 100) / 100);
}
async function calculateDistributions({
  tipPoolType,
  totalTipsCents,
  startDate,
  endDate,
  context
}) {
  if (tipPoolType === "individual") return [];
  const entries = await context.sudo().query.Shift.findMany({
    where: {
      status: { equals: "completed" },
      clockIn: { gte: startDate, lte: endDate }
    },
    query: "id role hoursWorked clockIn clockOut staff { id name }"
  });
  const distributions = [];
  if (tipPoolType === "house_pool") {
    const eligible = entries.map((entry) => ({ ...entry, hours: calculateHours(entry) })).filter((entry) => entry.staff?.id && entry.hours > 0);
    const totalHours = eligible.reduce((sum, entry) => sum + entry.hours, 0);
    for (const entry of eligible) {
      const shareCents = totalHours > 0 ? Math.round(entry.hours / totalHours * totalTipsCents) : 0;
      distributions.push({
        staffId: entry.staff.id,
        staffName: entry.staff.name,
        role: entry.role,
        hoursWorked: entry.hours,
        amount: shareCents
      });
    }
  } else if (tipPoolType === "pool_by_role") {
    const roleGroups = {};
    for (const entry of entries) {
      const hours = calculateHours(entry);
      if (!entry.staff?.id || hours <= 0) continue;
      const role = entry.role || "server";
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push({ ...entry, hours });
    }
    for (const [role, roleEntries] of Object.entries(roleGroups)) {
      const rolePercent = ROLE_PERCENTAGES[role] || 10;
      const roleTipsCents = Math.round(rolePercent / 100 * totalTipsCents);
      const totalRoleHours = roleEntries.reduce((sum, entry) => sum + entry.hours, 0);
      for (const entry of roleEntries) {
        const shareCents = totalRoleHours > 0 ? Math.round(entry.hours / totalRoleHours * roleTipsCents) : 0;
        distributions.push({
          staffId: entry.staff.id,
          staffName: entry.staff.name,
          role,
          hoursWorked: entry.hours,
          amount: shareCents
        });
      }
    }
  }
  return distributions;
}
async function createTipPoolLedger(root, args, context) {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage tip pools" };
  }
  if (!["individual", "pool_by_role", "house_pool"].includes(args.tipPoolType)) {
    return { success: false, error: "Invalid tip pool type" };
  }
  try {
    const { start, end } = getBusinessDayWindow(args.date);
    const cashTips = dollarsToCents(args.cashTips);
    const creditTips = dollarsToCents(args.creditTips);
    const totalTips = cashTips + creditTips;
    if (totalTips <= 0) return { success: false, error: "Tip pool must include cash or credit tips" };
    const existing = await context.sudo().query.TipPool.findMany({
      where: {
        date: { gte: start.toISOString(), lte: end.toISOString() },
        tipPoolType: { equals: args.tipPoolType },
        status: { in: ["open", "calculated"] }
      },
      query: "id status tipPoolType",
      take: 1
    });
    if (existing.length > 0) {
      return { success: false, error: "An open or calculated tip pool already exists for this date and type" };
    }
    const distributions = await calculateDistributions({
      tipPoolType: args.tipPoolType,
      totalTipsCents: totalTips,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      context
    });
    if (args.tipPoolType !== "individual" && distributions.length === 0) {
      return { success: false, error: "No completed shifts found for this tip pool" };
    }
    await context.sudo().db.TipPool.createOne({
      data: {
        date: start.toISOString(),
        tipPoolType: args.tipPoolType,
        totalTips,
        cashTips,
        creditTips,
        distributions,
        status: "calculated",
        createdBy: context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0
      }
    });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
async function updateTipPoolStatus(root, args, context) {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage tip pools" };
  }
  try {
    const tipPool = await context.sudo().query.TipPool.findOne({
      where: { id: args.tipPoolId },
      query: "id status"
    });
    if (!tipPool) return { success: false, error: "Tip pool not found" };
    if (args.action === "distribute") {
      if (tipPool.status !== "calculated") return { success: false, error: "Only calculated tip pools can be distributed" };
      await context.sudo().db.TipPool.updateOne({ where: { id: args.tipPoolId }, data: { status: "distributed" } });
    } else if (args.action === "reopen") {
      if (tipPool.status !== "distributed") return { success: false, error: "Only distributed tip pools can be reopened" };
      await context.sudo().db.TipPool.updateOne({ where: { id: args.tipPoolId }, data: { status: "calculated" } });
    } else {
      return { success: false, error: "Invalid tip pool action" };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// features/keystone/mutations/index.ts
var graphql15 = String.raw;
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql15`
      input UserUpdateProfileInput {
        email: String
        name: String
        phone: String
        password: String
        onboardingStatus: String
      }

      type Query {
        redirectToInit: Boolean
        getPaymentStatus(paymentIntentId: String!): GetPaymentStatusResult
        activeCart(cartId: ID!): JSON
        activeCartPaymentProviders: [PaymentProvider!]
        getCustomerOrder(orderId: ID!, secretKey: String): JSON
        getCustomerOrders(limit: Int, offset: Int): JSON
      }

      type Mutation {
        updateActiveUser(data: UserUpdateProfileInput!): User
        updateActiveCart(cartId: ID!, data: CartUpdateInput!): Cart
        updateCartItemQuantity(cartItemId: ID!, quantity: Int!): Cart
        removeCartItem(cartItemId: ID!): Cart

        processPayment(
          orderId: String!
          amount: Int!
          paymentMethod: String!
          tipAmount: Int
        ): ProcessPaymentResult

        capturePayment(
          paymentIntentId: String!
        ): CapturePaymentResult

        splitCheckByItem(
          orderId: String!
          itemIds: [String!]!
        ): SplitCheckResult

        splitCheckByGuest(
          orderId: String!
          guestCount: Int!
        ): SplitCheckResult

        voidOrderItem(
          orderItemId: String!
          reason: String!
          managerApproval: Boolean
          managerId: String
        ): VoidCompResult

        compOrderItem(
          orderItemId: String!
          reason: String!
          compAmount: Int
          managerApproval: Boolean
          managerId: String
        ): VoidCompResult

        voidOrder(
          orderId: String!
          reason: String!
          managerApproval: Boolean
          managerId: String
        ): VoidCompResult

        initiatePaymentSession(
          cartId: ID!
          paymentProviderId: String!
        ): InitiatePaymentSessionResult

        completeActiveCart(
          cartId: ID!
          paymentSessionId: ID
        ): RestaurantOrder

        createPOSOrder(
          orderType: String!
          guestCount: Int
          tableIds: [ID!]
          isUrgent: Boolean
          specialInstructions: String
          items: [POSOrderItemInput!]!
        ): RestaurantOrder

        addServiceFloorItem(
          orderId: ID
          tableId: ID!
          menuItemId: ID!
          quantity: Int!
          courseNumber: Int
          seatNumber: Int
          specialInstructions: String
        ): RestaurantOrder

        updateServiceFloorItem(
          orderItemId: ID!
          quantity: Int
          courseNumber: Int
          seatNumber: Int
          specialInstructions: String
          voidReason: String
        ): RestaurantOrder

        updateServiceFloorTableStatus(
          tableId: ID!
          status: String!
        ): ServiceFloorMutationResult

        updateServiceFloorCheckStatus(
          orderId: ID!
          action: String!
        ): ServiceFloorMutationResult

        createWaitlistGuest(
          customerName: String!
          phoneNumber: String!
          partySize: Int!
          quotedWaitTime: Int
          notes: String
        ): WaitlistMutationResult

        updateWaitlistStatus(
          entryId: ID!
          action: String!
          tableId: ID
        ): WaitlistMutationResult

        upsertReservation(
          reservationId: ID
          customerName: String!
          customerPhone: String
          customerEmail: String
          reservationDate: String!
          partySize: Int!
          duration: Int
          status: String
          specialRequests: String
          assignedTableId: ID
        ): ReservationMutationResult

        updateReservationStatus(
          reservationId: ID!
          action: String!
          tableId: ID
        ): ReservationMutationResult

        upsertShift(
          shiftId: ID
          staffId: ID
          role: String!
          startTime: String!
          endTime: String!
          hourlyRate: String
        ): ShiftMutationResult

        updateShiftStatus(
          shiftId: ID!
          action: String!
        ): ShiftMutationResult

        createTipPoolLedger(
          date: String!
          tipPoolType: String!
          cashTips: String!
          creditTips: String!
        ): TipPoolMutationResult

        updateTipPoolStatus(
          tipPoolId: ID!
          action: String!
        ): TipPoolMutationResult

        transferTable(
          orderId: String!
          fromTableId: String!
          toTableId: String!
        ): TableManagementResult

        combineTables(
          orderId: String!
          tableIds: [String!]!
        ): TableManagementResult

        fireCourse(
          courseId: String!
        ): CourseManagementResult

        recallCourse(
          courseId: String!
        ): CourseManagementResult

        syncKitchenTickets: SyncKitchenTicketsResult

        updateKitchenTicketStatus(
          ticketId: String!
          status: String!
        ): KitchenTicketMutationResult

        fulfillKitchenTicketItem(
          ticketId: String!
          itemId: String!
          fulfilled: Boolean!
        ): KitchenTicketMutationResult

        handlePaymentProviderWebhook(
          providerCode: String!
          event: JSON!
          headers: JSON!
        ): HandleWebhookResult
      }

      type ProcessPaymentResult {
        success: Boolean!
        paymentId: String
        clientSecret: String
        error: String
      }

      type CapturePaymentResult {
        success: Boolean!
        status: String
        error: String
      }

      type GetPaymentStatusResult {
        status: String
        amount: Int
        error: String
      }

      type SplitCheckResult {
        success: Boolean!
        newOrderIds: [String!]!
        error: String
      }

      type VoidCompResult {
        success: Boolean!
        requiresManagerApproval: Boolean!
        adjustedAmount: Int
        error: String
      }

      input POSOrderItemInput {
        menuItemId: ID!
        quantity: Int!
        courseNumber: Int
      }

      type InitiatePaymentSessionResult {
        id: ID!
        data: JSON
        amount: Int
      }

      type TableManagementResult {
        success: Boolean!
        error: String
      }

      type ServiceFloorMutationResult {
        success: Boolean!
        error: String
      }

      type WaitlistMutationResult {
        success: Boolean!
        error: String
      }

      type ReservationMutationResult {
        success: Boolean!
        error: String
      }

      type ShiftMutationResult {
        success: Boolean!
        error: String
      }

      type TipPoolMutationResult {
        success: Boolean!
        error: String
      }

      type CourseManagementResult {
        success: Boolean!
        error: String
      }

      type SyncKitchenTicketsResult {
        success: Boolean!
        created: Int!
        updated: Int!
        error: String
      }

      type KitchenTicketMutationResult {
        success: Boolean!
        error: String
      }

      type HandleWebhookResult {
        success: Boolean!
        error: String
      }
    `,
    resolvers: {
      Query: {
        redirectToInit: redirectToInit_default,
        getPaymentStatus: getPaymentStatus2,
        activeCart,
        activeCartPaymentProviders,
        getCustomerOrder,
        getCustomerOrders
      },
      Mutation: {
        updateActiveUser: updateActiveUser_default,
        updateActiveCart,
        updateCartItemQuantity,
        removeCartItem,
        processPayment,
        capturePayment: capturePaymentMutation,
        splitCheckByItem,
        splitCheckByGuest,
        voidOrderItem,
        compOrderItem,
        voidOrder,
        initiatePaymentSession,
        completeActiveCart,
        createPOSOrder,
        addServiceFloorItem,
        updateServiceFloorItem,
        updateServiceFloorTableStatus,
        updateServiceFloorCheckStatus,
        createWaitlistGuest: createWaitlistEntry,
        updateWaitlistStatus,
        upsertReservation,
        updateReservationStatus,
        upsertShift,
        updateShiftStatus,
        createTipPoolLedger,
        updateTipPoolStatus,
        transferTable,
        combineTables,
        fireCourse,
        recallCourse,
        syncKitchenTickets,
        updateKitchenTicketStatus,
        fulfillKitchenTicketItem,
        handlePaymentProviderWebhook
      }
    }
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}

// features/keystone/index.ts
var import_iron = __toESM(require("@hapi/iron"));
var cookie2 = __toESM(require("cookie"));
var databaseURL = process.env.DATABASE_URL || "file:./keystone.db";
var sessionConfig = {
  maxAge: 60 * 60 * 24 * 360,
  // How long they stay signed in?
  secret: process.env.SESSION_SECRET || "this secret should only be used in testing"
};
var {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com"
} = process.env;
function statelessSessions({
  secret,
  maxAge = 60 * 60 * 24 * 360,
  path = "/",
  secure = process.env.NODE_ENV === "production",
  ironOptions = import_iron.default.defaults,
  domain,
  sameSite = "lax",
  cookieName = "keystonejs-session"
}) {
  if (!secret) {
    throw new Error("You must specify a session secret to use sessions");
  }
  if (secret.length < 32) {
    throw new Error("The session secret must be at least 32 characters long");
  }
  return {
    async get({ context }) {
      if (!context?.req) return;
      const authHeader = context.req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const accessToken = authHeader.replace("Bearer ", "");
        try {
          return await import_iron.default.unseal(accessToken, secret, ironOptions);
        } catch (err) {
        }
      }
      const cookies = cookie2.parse(context.req.headers.cookie || "");
      const token = cookies[cookieName];
      if (!token) return;
      try {
        return await import_iron.default.unseal(token, secret, ironOptions);
      } catch (err) {
      }
    },
    async end({ context }) {
      if (!context?.res) return;
      context.res.setHeader(
        "Set-Cookie",
        cookie2.serialize(cookieName, "", {
          maxAge: 0,
          expires: /* @__PURE__ */ new Date(),
          httpOnly: true,
          secure,
          path,
          sameSite,
          domain
        })
      );
    },
    async start({ context, data }) {
      if (!context?.res) return;
      const sealedData = await import_iron.default.seal(data, secret, {
        ...ironOptions,
        ttl: maxAge * 1e3
      });
      context.res.setHeader(
        "Set-Cookie",
        cookie2.serialize(cookieName, sealedData, {
          maxAge,
          expires: new Date(Date.now() + maxAge * 1e3),
          httpOnly: true,
          secure,
          path,
          sameSite,
          domain
        })
      );
      return sealedData;
    }
  };
}
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          canAccessDashboard: true,
          canReadOrders: true,
          canManageOrders: true,
          canReadPayments: true,
          canManagePayments: true,
          canReadProducts: true,
          canManageProducts: true,
          canReadCart: true,
          canManageCart: true,
          canReadInventory: true,
          canManageInventory: true,
          canReadUsers: true,
          canManageUsers: true,
          canSeeOtherPeople: true,
          canEditOtherPeople: true,
          canManagePeople: true,
          canReadRoles: true,
          canManageRoles: true,
          canReadKitchen: true,
          canManageKitchen: true,
          canReadTables: true,
          canManageTables: true,
          canReadStaff: true,
          canManageStaff: true,
          canManageSettings: true,
          canManageOnboarding: true,
          canReadVendors: true,
          canManageVendors: true,
          canReadGiftCards: true,
          canManageGiftCards: true,
          canReadDiscounts: true,
          canManageDiscounts: true
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    }
  },
  sessionData: `
    id
    name
    email
    role {
      id
      name
      canAccessDashboard
      canReadOrders
      canManageOrders
      canReadPayments
      canManagePayments
      canReadProducts
      canManageProducts
      canReadCart
      canManageCart
      canReadInventory
      canManageInventory
      canReadUsers
      canManageUsers
      canSeeOtherPeople
      canEditOtherPeople
      canManagePeople
      canReadRoles
      canManageRoles
      canReadKitchen
      canManageKitchen
      canReadTables
      canManageTables
      canReadStaff
      canManageStaff
      canManageSettings
      canManageOnboarding
      canReadVendors
      canManageVendors
      canReadGiftCards
      canManageGiftCards
      canReadDiscounts
      canManageDiscounts
    }
  `
});
var keystone_default = withAuth(
  (0, import_core42.config)({
    db: {
      provider: "postgresql",
      url: databaseURL
    },
    lists: models,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5e3 },
        forcePathStyle: true
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => permissions.canAccessDashboard({ session }),
      basePath: "/dashboard"
    },
    session: statelessSessions(sessionConfig),
    graphql: {
      extendGraphqlSchema
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
