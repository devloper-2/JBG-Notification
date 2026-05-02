import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import OutletsPage from "./pages/OutletsPage";
import RawMaterialsPage from "./pages/RawMaterialsPage";
import StockItemsPage from "./pages/StockItemsPage";
import OutletStockPage from "./pages/OutletStockPage";
import OrdersPage from "./pages/OrdersPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminExpensesPage from "./pages/AdminExpensesPage";
import ExpensesPage from "./pages/ExpensesPage";
import AdminStaffPage from "./pages/AdminStaffPage";
import MenuItemsPage from "./pages/MenuItemsPage";
import OutletMenuPage from "./pages/OutletMenuPage";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetailsPage from "./pages/InvoiceDetailsPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import EditInvoicePage from "./pages/EditInvoicePage";
import { AuthProvider } from "./context/AuthContext";
import { SearchProvider } from "./context/SearchContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/common/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <ScrollToTop />
          <Routes>
          {/* Protected Dashboard Layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index path="/" element={<Home />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/admin-orders" element={<AdminOrdersPage />} />
            <Route path="/admin-expenses" element={<AdminExpensesPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/admin-staff" element={<AdminStaffPage />} />
            <Route path="/staff" element={<AdminStaffPage />} />
            <Route path="/outlets" element={<OutletsPage />} />
            <Route path="/raw-materials" element={<RawMaterialsPage />} />
            <Route path="/stock-items" element={<StockItemsPage />} />
            <Route path="/outlet-stock" element={<OutletStockPage />} />
            <Route path="/menu-items" element={<MenuItemsPage />} />
            <Route path="/outlet-menu" element={<OutletMenuPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/create" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Public-only Auth Routes */}
          <Route path="/signin" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </SearchProvider>
    </AuthProvider>
  );
}
