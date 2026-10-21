import { forwardRef } from "react";
import { navigate } from "../router";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, ...rest }, ref) {
  return (
    <a
      ref={ref}
      href={href.includes("#") ? `#${href.split("#")[1]}` : "#"}
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
});

export default Link;
