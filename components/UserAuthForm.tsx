"use client";
import { signIn } from "next-auth/react";
import * as React from "react";
import { FC } from "react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
// import { useToast } from "@/hooks/use-toast";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLButtonElement> {}

const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
  //   const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);

  const loginWithGoogle = async () => {
    setIsGoogleLoading(true);

    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      toast.error("Errore di login");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Button
      // isLoading={isGoogleLoading}
      type="button"
      size="lg"
      className={cn("w-56 font-semibold", className)}
      onClick={loginWithGoogle}
      disabled={isGoogleLoading}
      {...props}
    >
      {/* {isGoogleLoading ? null : <Icons.google className="h-4 w-4 mr-2" />} */}
      Login
    </Button>
  );
};

export default UserAuthForm;
