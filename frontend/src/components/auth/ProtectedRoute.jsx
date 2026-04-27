import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext"; // Adjust path if needed
import { Loader2 } from "lucide-react";

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useContext(AuthContext);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-foreground animate-spin" />
      </div>
    );
  }

  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;