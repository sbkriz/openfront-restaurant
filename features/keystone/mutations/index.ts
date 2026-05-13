import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from 'graphql';
import redirectToInit from "./redirectToInit";
import updateActiveUser from "./updateActiveUser";
import processPayment, { capturePaymentMutation, getPaymentStatus } from "./processPayment";
import { splitCheckByItem, splitCheckByGuest } from "./splitCheck";
import { voidOrderItem, compOrderItem, voidOrder } from "./voidComp";
import initiatePaymentSession from "./initiatePaymentSession";
import completeActiveCart from "./completeActiveCart";
import activeCart from "./activeCart";
import updateActiveCart from "./updateActiveCart";
import updateCartItemQuantity from "./updateCartItemQuantity";
import removeCartItem from "./removeCartItem";
import getCustomerOrder from "./getCustomerOrder";
import getCustomerOrders from "./getCustomerOrders";
import activeCartPaymentProviders from "../queries/activeCartPaymentProviders";
import { transferTable, combineTables } from "./tableManagement";
import { fireCourse, recallCourse } from "./courseManagement";
import { syncKitchenTickets, updateKitchenTicketStatus, fulfillKitchenTicketItem } from "./kdsTickets";
import handlePaymentProviderWebhook from "./handlePaymentProviderWebhook";
import createPOSOrder from "./createPOSOrder";
import addServiceFloorItem from "./addServiceFloorItem";
import updateServiceFloorItem from "./updateServiceFloorItem";
import { updateServiceFloorCheckStatus, updateServiceFloorTableStatus } from "./serviceFloorTable";
import { createWaitlistEntry, updateWaitlistStatus } from "./waitlistManagement";
import { updateReservationStatus, upsertReservation } from "./reservationManagement";
import { updateShiftStatus, upsertShift } from "./shiftManagement";
import { createTipPoolLedger, updateTipPoolStatus } from "./tipManagement";

const graphql = String.raw;

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
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
        redirectToInit,
        getPaymentStatus,
        activeCart,
        activeCartPaymentProviders,
        getCustomerOrder,
        getCustomerOrders,
      },
      Mutation: {
        updateActiveUser,
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
        handlePaymentProviderWebhook,
      },
    },
  });
}
