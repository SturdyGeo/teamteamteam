import {
  HttpClient,
  createMutationMethods,
  createQueryMethods,
  type MutationMethods,
  type QueryMethods,
} from "@teamteamteam/api-client/web";
import { webEnv } from "./env";
import { supabase } from "./supabase";

const http = new HttpClient({
  baseUrl: webEnv.apiUrl,
  getToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

type WebApiClient = QueryMethods & MutationMethods;

export const apiClient: WebApiClient = {
  ...createQueryMethods(http),
  ...createMutationMethods(http),
};
