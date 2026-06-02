import { useEffect, useRef, useState } from "react";
import { getStudentPhoto, primeStudentPhoto } from "@/utils/student-photo-cache";

type StudentAvatarProps = {
  studentId: string;
  name?: string;
  /** Foto que já veio junto na lista (ex.: Modo B). Se ausente, carrega sob demanda. */
  initialPhoto?: string | null;
  /** Classe do container (tamanho, arredondamento, overflow-hidden, centralização). */
  className?: string;
  /** Classe do texto da inicial (fallback). */
  fallbackClassName?: string;
  /** Classe da imagem. */
  imgClassName?: string;
};

/**
 * Avatar do aluno com carregamento lazy da foto: a miniatura só busca a foto
 * quando entra na viewport, mantendo o boot leve. Usa cache em lote compartilhado.
 */
export default function StudentAvatar({
  studentId,
  name,
  initialPhoto,
  className,
  fallbackClassName,
  imgClassName,
}: StudentAvatarProps) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto ?? null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialPhoto) {
      primeStudentPhoto(studentId, initialPhoto);
      setPhoto(initialPhoto);
      return;
    }

    setPhoto(null);
    let active = true;
    const load = () => {
      void getStudentPhoto(studentId).then((p) => {
        if (active) setPhoto(p);
      });
    };

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      load();
      return () => {
        active = false;
      };
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          load();
        }
      },
      { rootMargin: "150px" }
    );
    obs.observe(el);
    return () => {
      active = false;
      obs.disconnect();
    };
  }, [studentId, initialPhoto]);

  const initial = (name || "A").charAt(0).toUpperCase();

  return (
    <div ref={ref} className={className}>
      {photo ? (
        <img src={photo} alt={name || ""} className={imgClassName || "w-full h-full object-cover"} />
      ) : (
        <span className={fallbackClassName}>{initial}</span>
      )}
    </div>
  );
}
