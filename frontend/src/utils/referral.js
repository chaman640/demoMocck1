import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

/** Student ka referral code + link (Profile card aur result share card dono use karte hain) */
export const useReferral = (enabled = true) =>
  useQuery({
    queryKey: ["referral-me"],
    queryFn: async () => (await api.get("/referral/me")).data.data,
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled,
  });

export const referralShareText = (ref) =>
  `I'm preparing with free mock tests and PYQs on AntimPrayash.in 📚\n` +
  `Join too — my code: ${ref.code}\n${ref.link}`;
