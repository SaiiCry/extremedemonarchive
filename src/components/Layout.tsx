import { Outlet } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

// Layout 组件
function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export default Layout;