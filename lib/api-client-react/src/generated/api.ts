PATCH'


  }
);}





export const getApproveMemberMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof approveMember>>, TError,{memberId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof approveMember>>, TError,{memberId: string}, TContext> => {

const mutationKey = ['approveMember'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof approveMember>>, {memberId: string}> = (props) => {
          const {memberId} = props ?? {};

          return  approveMember(memberId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type ApproveMemberMutationResult = NonNullable<Awaited<ReturnType<typeof approveMember>>>

    export type ApproveMemberMutationError = ErrorType<unknown>

    export const useApproveMember = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof approveMember>>, TError,{memberId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof approveMember>>,
        TError,
        {memberId: string},
        TContext
      > => {
      return useMutation(getApproveMemberMutationOptions(options));
    }

export const getDenyMemberUrl = (memberId: string,) => {




  return `/api/admin/members/${memberId}/deny`
}

export const denyMember = async (memberId: string,
    moderationReason?: ModerationReason, options?: Parameters<typeof customFetch>[1]): Promise<MemberDenialResult> => {

  return customFetch<MemberDenialResult>(getDenyMemberUrl(memberId),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(moderationReason)
  }
);}





export const getDenyMemberMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof denyMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof denyMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext> => {

const mutationKey = ['denyMember'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof denyMember>>, {memberId: string;data?: BodyType<ModerationReason>}> = (props) => {
          const {memberId,data} = props ?? {};

          return  denyMember(memberId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type DenyMemberMutationResult = NonNullable<Awaited<ReturnType<typeof denyMember>>>
    export type DenyMemberMutationBody = BodyType<ModerationReason> | undefined
    export type DenyMemberMutationError = ErrorType<unknown>

    export const useDenyMember = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof denyMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof denyMember>>,
        TError,
        {memberId: string;data?: BodyType<ModerationReason>},
        TContext
      > => {
      return useMutation(getDenyMemberMutationOptions(options));
    }

export const getBanMemberUrl = (memberId: string,) => {




  return `/api/admin/members/${memberId}/ban`
}

export const banMember = async (memberId: string,
    moderationReason?: ModerationReason, options?: Parameters<typeof customFetch>[1]): Promise<MemberModerationResult> => {

  return customFetch<MemberModerationResult>(getBanMemberUrl(memberId),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(moderationReason)
  }
);}





export const getBanMemberMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof banMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof banMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext> => {

const mutationKey = ['banMember'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof banMember>>, {memberId: string;data?: BodyType<ModerationReason>}> = (props) => {
          const {memberId,data} = props ?? {};

          return  banMember(memberId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type BanMemberMutationResult = NonNullable<Awaited<ReturnType<typeof banMember>>>
    export type BanMemberMutationBody = BodyType<ModerationReason> | undefined
    export type BanMemberMutationError = ErrorType<unknown>

    export const useBanMember = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof banMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof banMember>>,
        TError,
        {memberId: string;data?: BodyType<ModerationReason>},
        TContext
      > => {
      return useMutation(getBanMemberMutationOptions(options));
    }

export const getDeleteMemberUrl = (memberId: string,) => {




  return `/api/admin/members/${memberId}`
}

export const deleteMember = async (memberId: string,
    moderationReason?: ModerationReason, options?: Parameters<typeof customFetch>[1]): Promise<Message> => {

  return customFetch<Message>(getDeleteMemberUrl(memberId),
  {
    ...options,
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(moderationReason)
  }
);}





export const getDeleteMemberMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof deleteMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext> => {

const mutationKey = ['deleteMember'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteMember>>, {memberId: string;data?: BodyType<ModerationReason>}> = (props) => {
          const {memberId,data} = props ?? {};

          return  deleteMember(memberId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type DeleteMemberMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMember>>>
    export type DeleteMemberMutationBody = BodyType<ModerationReason> | undefined
    export type DeleteMemberMutationError = ErrorType<unknown>

    export const useDeleteMember = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteMember>>, TError,{memberId: string;data?: BodyType<ModerationReason>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof deleteMember>>,
        TError,
        {memberId: string;data?: BodyType<ModerationReason>},
        TContext
      > => {
      return useMutation(getDeleteMemberMutationOptions(options));
    }

export const getUpdateMemberRoleUrl = (memberId: string,) => {




  return `/api/admin/members/${memberId}/role`
}

export const updateMemberRole = async (memberId: string,
    adminMemberRoleUpdate: AdminMemberRoleUpdate, options?: Parameters<typeof customFetch>[1]): Promise<MemberRoleUpdateResult> => {

  return customFetch<MemberRoleUpdateResult>(getUpdateMemberRoleUrl(memberId),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(adminMemberRoleUpdate)
  }
);}





export const getUpdateMemberRoleMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMemberRole>>, TError,{memberId: string;data: BodyType<AdminMemberRoleUpdate>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateMemberRole>>, TError,{memberId: string;data: BodyType<AdminMemberRoleUpdate>}, TContext> => {

const mutationKey = ['updateMemberRole'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateMemberRole>>, {memberId: string;data: BodyType<AdminMemberRoleUpdate>}> = (props) => {
          const {memberId,data} = props ?? {};

          return  updateMemberRole(memberId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateMemberRoleMutationResult = NonNullable<Awaited<ReturnType<typeof updateMemberRole>>>
    export type UpdateMemberRoleMutationBody = BodyType<AdminMemberRoleUpdate>
    export type UpdateMemberRoleMutationError = ErrorType<ErrorResponse>

    export const useUpdateMemberRole = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMemberRole>>, TError,{memberId: string;data: BodyType<AdminMemberRoleUpdate>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateMemberRole>>,
        TError,
        {memberId: string;data: BodyType<AdminMemberRoleUpdate>},
        TContext
      > => {
      return useMutation(getUpdateMemberRoleMutationOptions(options));
    }

export const getUpdateMemberChapterUrl = (memberId: string,) => {




  return `/api/admin/members/${memberId}/chapter`
}

export const updateMemberChapter = async (memberId: string,
    adminMemberChapterUpdate: AdminMemberChapterUpdate, options?: Parameters<typeof customFetch>[1]): Promise<MemberChapterUpdateResult> => {

  return customFetch<MemberChapterUpdateResult>(getUpdateMemberChapterUrl(memberId),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(adminMemberChapterUpdate)
  }
);}





export const getUpdateMemberChapterMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMemberChapter>>, TError,{memberId: string;data: BodyType<AdminMemberChapterUpdate>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateMemberChapter>>, TError,{memberId: string;data: BodyType<AdminMemberChapterUpdate>}, TContext> => {

const mutationKey = ['updateMemberChapter'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateMemberChapter>>, {memberId: string;data: BodyType<AdminMemberChapterUpdate>}> = (props) => {
          const {memberId,data} = props ?? {};

          return  updateMemberChapter(memberId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateMemberChapterMutationResult = NonNullable<Awaited<ReturnType<typeof updateMemberChapter>>>
    export type UpdateMemberChapterMutationBody = BodyType<AdminMemberChapterUpdate>
    export type UpdateMemberChapterMutationError = ErrorType<ErrorResponse>

    export const useUpdateMemberChapter = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMemberChapter>>, TError,{memberId: string;data: BodyType<AdminMemberChapterUpdate>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateMemberChapter>>,
        TError,
        {memberId: string;data: BodyType<AdminMemberChapterUpdate>},
        TContext
      > => {
      return useMutation(getUpdateMemberChapterMutationOptions(options));
    }

export const getGetMemberActivityUrl = (memberId: string,) => {




  return `/api/admin/members/${memberId}/activity`
}

export const getMemberActivity = async (memberId: string, options?: Parameters<typeof customFetch>[1]): Promise<MemberActivityResult> => {

  return customFetch<MemberActivityResult>(getGetMemberActivityUrl(memberId),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetMemberActivityQueryKey = (memberId: string,) => {
    return [
    `/api/admin/members/${memberId}/activity`
    ] as const;
    }


export const getGetMemberActivityQueryOptions = <TData = Awaited<ReturnType<typeof getMemberActivity>>, TError = ErrorType<unknown>>(memberId: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMemberActivity>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetMemberActivityQueryKey(memberId);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getMemberActivity>>> = ({ signal }) => getMemberActivity(memberId, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: memberId !== null && memberId !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getMemberActivity>>, TError, TData> & { queryKey: QueryKey }
}

export type GetMemberActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberActivity>>>
export type GetMemberActivityQueryError = ErrorType<unknown>



export function useGetMemberActivity<TData = Awaited<ReturnType<typeof getMemberActivity>>, TError = ErrorType<unknown>>(
 memberId: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMemberActivity>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetMemberActivityQueryOptions(memberId,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetPostAnalyticsUrl = (params?: GetPostAnalyticsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/analytics/posts?${stringifiedParams}` : `/api/admin/analytics/posts`
}

export const getPostAnalytics = async (params?: GetPostAnalyticsParams, options?: Parameters<typeof customFetch>[1]): Promise<PostAnalyticsResult> => {

  return customFetch<PostAnalyticsResult>(getGetPostAnalyticsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetPostAnalyticsQueryKey = (params?: GetPostAnalyticsParams,) => {
    return [
    `/api/admin/analytics/posts`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetPostAnalyticsQueryOptions = <TData = Awaited<ReturnType<typeof getPostAnalytics>>, TError = ErrorType<unknown>>(params?: GetPostAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPostAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetPostAnalyticsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getPostAnalytics>>> = ({ signal }) => getPostAnalytics(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getPostAnalytics>>, TError, TData> & { queryKey: QueryKey }
}

export type GetPostAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getPostAnalytics>>>
export type GetPostAnalyticsQueryError = ErrorType<unknown>



export function useGetPostAnalytics<TData = Awaited<ReturnType<typeof getPostAnalytics>>, TError = ErrorType<unknown>>(
 params?: GetPostAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPostAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetPostAnalyticsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetMemberAnalyticsUrl = (params?: GetMemberAnalyticsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/analytics/members?${stringifiedParams}` : `/api/admin/analytics/members`
}

export const getMemberAnalytics = async (params?: GetMemberAnalyticsParams, options?: Parameters<typeof customFetch>[1]): Promise<MemberAnalyticsResult> => {

  return customFetch<MemberAnalyticsResult>(getGetMemberAnalyticsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetMemberAnalyticsQueryKey = (params?: GetMemberAnalyticsParams,) => {
    return [
    `/api/admin/analytics/members`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetMemberAnalyticsQueryOptions = <TData = Awaited<ReturnType<typeof getMemberAnalytics>>, TError = ErrorType<unknown>>(params?: GetMemberAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMemberAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetMemberAnalyticsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getMemberAnalytics>>> = ({ signal }) => getMemberAnalytics(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getMemberAnalytics>>, TError, TData> & { queryKey: QueryKey }
}

export type GetMemberAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberAnalytics>>>
export type GetMemberAnalyticsQueryError = ErrorType<unknown>



export function useGetMemberAnalytics<TData = Awaited<ReturnType<typeof getMemberAnalytics>>, TError = ErrorType<unknown>>(
 params?: GetMemberAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMemberAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetMemberAnalyticsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetShareTimelineUrl = (params?: GetShareTimelineParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/analytics/shares-timeline?${stringifiedParams}` : `/api/admin/analytics/shares-timeline`
}

export const getShareTimeline = async (params?: GetShareTimelineParams, options?: Parameters<typeof customFetch>[1]): Promise<ShareTimelinePoint[]> => {

  return customFetch<ShareTimelinePoint[]>(getGetShareTimelineUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetShareTimelineQueryKey = (params?: GetShareTimelineParams,) => {
    return [
    `/api/admin/analytics/shares-timeline`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetShareTimelineQueryOptions = <TData = Awaited<ReturnType<typeof getShareTimeline>>, TError = ErrorType<unknown>>(params?: GetShareTimelineParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getShareTimeline>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetShareTimelineQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getShareTimeline>>> = ({ signal }) => getShareTimeline(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getShareTimeline>>, TError, TData> & { queryKey: QueryKey }
}

export type GetShareTimelineQueryResult = NonNullable<Awaited<ReturnType<typeof getShareTimeline>>>
export type GetShareTimelineQueryError = ErrorType<unknown>



export function useGetShareTimeline<TData = Awaited<ReturnType<typeof getShareTimeline>>, TError = ErrorType<unknown>>(
 params?: GetShareTimelineParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getShareTimeline>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetShareTimelineQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetPlatformAnalyticsUrl = (params?: GetPlatformAnalyticsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/analytics/platforms?${stringifiedParams}` : `/api/admin/analytics/platforms`
}

export const getPlatformAnalytics = async (params?: GetPlatformAnalyticsParams, options?: Parameters<typeof customFetch>[1]): Promise<PlatformAnalytics> => {

  return customFetch<PlatformAnalytics>(getGetPlatformAnalyticsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetPlatformAnalyticsQueryKey = (params?: GetPlatformAnalyticsParams,) => {
    return [
    `/api/admin/analytics/platforms`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetPlatformAnalyticsQueryOptions = <TData = Awaited<ReturnType<typeof getPlatformAnalytics>>, TError = ErrorType<unknown>>(params?: GetPlatformAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPlatformAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetPlatformAnalyticsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getPlatformAnalytics>>> = ({ signal }) => getPlatformAnalytics(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getPlatformAnalytics>>, TError, TData> & { queryKey: QueryKey }
}

export type GetPlatformAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getPlatformAnalytics>>>
export type GetPlatformAnalyticsQueryError = ErrorType<unknown>



export function useGetPlatformAnalytics<TData = Awaited<ReturnType<typeof getPlatformAnalytics>>, TError = ErrorType<unknown>>(
 params?: GetPlatformAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPlatformAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetPlatformAnalyticsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetShareAnalyticsUrl = (params?: GetShareAnalyticsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/analytics/shares?${stringifiedParams}` : `/api/admin/analytics/shares`
}

export const getShareAnalytics = async (params?: GetShareAnalyticsParams, options?: Parameters<typeof customFetch>[1]): Promise<ShareAnalytics> => {

  return customFetch<ShareAnalytics>(getGetShareAnalyticsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetShareAnalyticsQueryKey = (params?: GetShareAnalyticsParams,) => {
    return [
    `/api/admin/analytics/shares`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetShareAnalyticsQueryOptions = <TData = Awaited<ReturnType<typeof getShareAnalytics>>, TError = ErrorType<unknown>>(params?: GetShareAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getShareAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetShareAnalyticsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getShareAnalytics>>> = ({ signal }) => getShareAnalytics(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getShareAnalytics>>, TError, TData> & { queryKey: QueryKey }
}

export type GetShareAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getShareAnalytics>>>
export type GetShareAnalyticsQueryError = ErrorType<unknown>



export function useGetShareAnalytics<TData = Awaited<ReturnType<typeof getShareAnalytics>>, TError = ErrorType<unknown>>(
 params?: GetShareAnalyticsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getShareAnalytics>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetShareAnalyticsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetChapterSettingsUrl = (params?: GetChapterSettingsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/settings?${stringifiedParams}` : `/api/admin/settings`
}

export const getChapterSettings = async (params?: GetChapterSettingsParams, options?: Parameters<typeof customFetch>[1]): Promise<SettingsResult> => {

  return customFetch<SettingsResult>(getGetChapterSettingsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetChapterSettingsQueryKey = (params?: GetChapterSettingsParams,) => {
    return [
    `/api/admin/settings`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetChapterSettingsQueryOptions = <TData = Awaited<ReturnType<typeof getChapterSettings>>, TError = ErrorType<unknown>>(params?: GetChapterSettingsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getChapterSettings>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetChapterSettingsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getChapterSettings>>> = ({ signal }) => getChapterSettings(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getChapterSettings>>, TError, TData> & { queryKey: QueryKey }
}

export type GetChapterSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof getChapterSettings>>>
export type GetChapterSettingsQueryError = ErrorType<unknown>



export function useGetChapterSettings<TData = Awaited<ReturnType<typeof getChapterSettings>>, TError = ErrorType<unknown>>(
 params?: GetChapterSettingsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getChapterSettings>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetChapterSettingsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getUpdateChapterSettingsUrl = (params?: UpdateChapterSettingsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/settings?${stringifiedParams}` : `/api/admin/settings`
}

export const updateChapterSettings = async (chapterSettingsInput: ChapterSettingsInput,
    params?: UpdateChapterSettingsParams, options?: Parameters<typeof customFetch>[1]): Promise<SettingsResult> => {

  return customFetch<SettingsResult>(getUpdateChapterSettingsUrl(params),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(chapterSettingsInput)
  }
);}





export const getUpdateChapterSettingsMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateChapterSettings>>, TError,{data: BodyType<ChapterSettingsInput>;params?: UpdateChapterSettingsParams}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateChapterSettings>>, TError,{data: BodyType<ChapterSettingsInput>;params?: UpdateChapterSettingsParams}, TContext> => {

const mutationKey = ['updateChapterSettings'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateChapterSettings>>, {data: BodyType<ChapterSettingsInput>;params?: UpdateChapterSettingsParams}> = (props) => {
          const {data,params} = props ?? {};

          return  updateChapterSettings(data,params,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateChapterSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateChapterSettings>>>
    export type UpdateChapterSettingsMutationBody = BodyType<ChapterSettingsInput>
    export type UpdateChapterSettingsMutationError = ErrorType<unknown>

    export const useUpdateChapterSettings = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateChapterSettings>>, TError,{data: BodyType<ChapterSettingsInput>;params?: UpdateChapterSettingsParams}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateChapterSettings>>,
        TError,
        {data: BodyType<ChapterSettingsInput>;params?: UpdateChapterSettingsParams},
        TContext
      > => {
      return useMutation(getUpdateChapterSettingsMutationOptions(options));
    }

export const getGetChapterGuidelinesUrl = (params?: GetChapterGuidelinesParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/guidelines?${stringifiedParams}` : `/api/admin/guidelines`
}

export const getChapterGuidelines = async (params?: GetChapterGuidelinesParams, options?: Parameters<typeof customFetch>[1]): Promise<GuidelinesResult> => {

  return customFetch<GuidelinesResult>(getGetChapterGuidelinesUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetChapterGuidelinesQueryKey = (params?: GetChapterGuidelinesParams,) => {
    return [
    `/api/admin/guidelines`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetChapterGuidelinesQueryOptions = <TData = Awaited<ReturnType<typeof getChapterGuidelines>>, TError = ErrorType<unknown>>(params?: GetChapterGuidelinesParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getChapterGuidelines>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetChapterGuidelinesQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getChapterGuidelines>>> = ({ signal }) => getChapterGuidelines(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getChapterGuidelines>>, TError, TData> & { queryKey: QueryKey }
}

export type GetChapterGuidelinesQueryResult = NonNullable<Awaited<ReturnType<typeof getChapterGuidelines>>>
export type GetChapterGuidelinesQueryError = ErrorType<unknown>



export function useGetChapterGuidelines<TData = Awaited<ReturnType<typeof getChapterGuidelines>>, TError = ErrorType<unknown>>(
 params?: GetChapterGuidelinesParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getChapterGuidelines>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetChapterGuidelinesQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getUpdateChapterGuidelinesUrl = (params?: UpdateChapterGuidelinesParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/guidelines?${stringifiedParams}` : `/api/admin/guidelines`
}

export const updateChapterGuidelines = async (guidelinesInput: GuidelinesInput,
    params?: UpdateChapterGuidelinesParams, options?: Parameters<typeof customFetch>[1]): Promise<GuidelinesUpdateResult> => {

  return customFetch<GuidelinesUpdateResult>(getUpdateChapterGuidelinesUrl(params),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(guidelinesInput)
  }
);}





export const getUpdateChapterGuidelinesMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateChapterGuidelines>>, TError,{data: BodyType<GuidelinesInput>;params?: UpdateChapterGuidelinesParams}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateChapterGuidelines>>, TError,{data: BodyType<GuidelinesInput>;params?: UpdateChapterGuidelinesParams}, TContext> => {

const mutationKey = ['updateChapterGuidelines'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateChapterGuidelines>>, {data: BodyType<GuidelinesInput>;params?: UpdateChapterGuidelinesParams}> = (props) => {
          const {data,params} = props ?? {};

          return  updateChapterGuidelines(data,params,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateChapterGuidelinesMutationResult = NonNullable<Awaited<ReturnType<typeof updateChapterGuidelines>>>
    export type UpdateChapterGuidelinesMutationBody = BodyType<GuidelinesInput>
    export type UpdateChapterGuidelinesMutationError = ErrorType<unknown>

    export const useUpdateChapterGuidelines = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateChapterGuidelines>>, TError,{data: BodyType<GuidelinesInput>;params?: UpdateChapterGuidelinesParams}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateChapterGuidelines>>,
        TError,
        {data: BodyType<GuidelinesInput>;params?: UpdateChapterGuidelinesParams},
        TContext
      > => {
      return useMutation(getUpdateChapterGuidelinesMutationOptions(options));
    }

export const getListModerationLogsUrl = (params?: ListModerationLogsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/admin/logs?${stringifiedParams}` : `/api/admin/logs`
}

export const listModerationLogs = async (params?: ListModerationLogsParams, options?: Parameters<typeof customFetch>[1]): Promise<ModerationLogList> => {

  return customFetch<ModerationLogList>(getListModerationLogsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListModerationLogsQueryKey = (params?: ListModerationLogsParams,) => {
    return [
    `/api/admin/logs`, ...(params ? [params] : [])
    ] as const;
    }


export const getListModerationLogsQueryOptions = <TData = Awaited<ReturnType<typeof listModerationLogs>>, TError = ErrorType<unknown>>(params?: ListModerationLogsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listModerationLogs>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListModerationLogsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listModerationLogs>>> = ({ signal }) => listModerationLogs(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listModerationLogs>>, TError, TData> & { queryKey: QueryKey }
}

export type ListModerationLogsQueryResult = NonNullable<Awaited<ReturnType<typeof listModerationLogs>>>
export type ListModerationLogsQueryError = ErrorType<unknown>



export function useListModerationLogs<TData = Awaited<ReturnType<typeof listModerationLogs>>, TError = ErrorType<unknown>>(
 params?: ListModerationLogsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listModerationLogs>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListModerationLogsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getListDirectConversationsUrl = () => {




  return `/api/messages/conversations`
}

export const listDirectConversations = async ( options?: Parameters<typeof customFetch>[1]): Promise<DirectConversationList> => {

  return customFetch<DirectConversationList>(getListDirectConversationsUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListDirectConversationsQueryKey = () => {
    return [
    `/api/messages/conversations`
    ] as const;
    }


export const getListDirectConversationsQueryOptions = <TData = Awaited<ReturnType<typeof listDirectConversations>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listDirectConversations>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListDirectConversationsQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listDirectConversations>>> = ({ signal }) => listDirectConversations({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listDirectConversations>>, TError, TData> & { queryKey: QueryKey }
}

export type ListDirectConversationsQueryResult = NonNullable<Awaited<ReturnType<typeof listDirectConversations>>>
export type ListDirectConversationsQueryError = ErrorType<unknown>



export function useListDirectConversations<TData = Awaited<ReturnType<typeof listDirectConversations>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listDirectConversations>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListDirectConversationsQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetDirectConversationUrl = (conversationId: string,
    params?: GetDirectConversationParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/messages/conversations/${conversationId}?${stringifiedParams}` : `/api/messages/conversations/${conversationId}`
}

export const getDirectConversation = async (conversationId: string,
    params?: GetDirectConversationParams, options?: Parameters<typeof customFetch>[1]): Promise<DirectConversationThread> => {

  return customFetch<DirectConversationThread>(getGetDirectConversationUrl(conversationId,params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetDirectConversationQueryKey = (conversationId: string,
    params?: GetDirectConversationParams,) => {
    return [
    `/api/messages/conversations/${conversationId}`, ...(params ? [params] : [])
    ] as const;
    }


export const getGetDirectConversationQueryOptions = <TData = Awaited<ReturnType<typeof getDirectConversation>>, TError = ErrorType<unknown>>(conversationId: string,
    params?: GetDirectConversationParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getDirectConversation>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetDirectConversationQueryKey(conversationId,params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getDirectConversation>>> = ({ signal }) => getDirectConversation(conversationId,params, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: conversationId !== null && conversationId !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getDirectConversation>>, TError, TData> & { queryKey: QueryKey }
}

export type GetDirectConversationQueryResult = NonNullable<Awaited<ReturnType<typeof getDirectConversation>>>
export type GetDirectConversationQueryError = ErrorType<unknown>



export function useGetDirectConversation<TData = Awaited<ReturnType<typeof getDirectConversation>>, TError = ErrorType<unknown>>(
 conversationId: string,
    params?: GetDirectConversationParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getDirectConversation>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetDirectConversationQueryOptions(conversationId,params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getSendDirectMessageUrl = () => {




  return `/api/messages`
}

export const sendDirectMessage = async (directMessageInput: DirectMessageInput, options?: Parameters<typeof customFetch>[1]): Promise<DirectMessageResponse> => {

  return customFetch<DirectMessageResponse>(getSendDirectMessageUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(directMessageInput)
  }
);}





export const getSendDirectMessageMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof sendDirectMessage>>, TError,{data: BodyType<DirectMessageInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof sendDirectMessage>>, TError,{data: BodyType<DirectMessageInput>}, TContext> => {

const mutationKey = ['sendDirectMessage'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof sendDirectMessage>>, {data: BodyType<DirectMessageInput>}> = (props) => {
          const {data} = props ?? {};

          return  sendDirectMessage(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type SendDirectMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendDirectMessage>>>
    export type SendDirectMessageMutationBody = BodyType<DirectMessageInput>
    export type SendDirectMessageMutationError = ErrorType<unknown>

    export const useSendDirectMessage = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof sendDirectMessage>>, TError,{data: BodyType<DirectMessageInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof sendDirectMessage>>,
        TError,
        {data: BodyType<DirectMessageInput>},
        TContext
      > => {
      return useMutation(getSendDirectMessageMutationOptions(options));
    }

export const getMarkDirectMessagesReadUrl = (conversationId: string,) => {




  return `/api/messages/conversations/${conversationId}/read`
}

export const markDirectMessagesRead = async (conversationId: string,
    directMessageReadInput: DirectMessageReadInput, options?: Parameters<typeof customFetch>[1]): Promise<DirectMessageReadResult> => {

  return customFetch<DirectMessageReadResult>(getMarkDirectMessagesReadUrl(conversationId),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(directMessageReadInput)
  }
);}





export const getMarkDirectMessagesReadMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof markDirectMessagesRead>>, TError,{conversationId: string;data: BodyType<DirectMessageReadInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof markDirectMessagesRead>>, TError,{conversationId: string;data: BodyType<DirectMessageReadInput>}, TContext> => {

const mutationKey = ['markDirectMessagesRead'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof markDirectMessagesRead>>, {conversationId: string;data: BodyType<DirectMessageReadInput>}> = (props) => {
          const {conversationId,data} = props ?? {};

          return  markDirectMessagesRead(conversationId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type MarkDirectMessagesReadMutationResult = NonNullable<Awaited<ReturnType<typeof markDirectMessagesRead>>>
    export type MarkDirectMessagesReadMutationBody = BodyType<DirectMessageReadInput>
    export type MarkDirectMessagesReadMutationError = ErrorType<unknown>

    export const useMarkDirectMessagesRead = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof markDirectMessagesRead>>, TError,{conversationId: string;data: BodyType<DirectMessageReadInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof markDirectMessagesRead>>,
        TError,
        {conversationId: string;data: BodyType<DirectMessageReadInput>},
        TContext
      > => {
      return useMutation(getMarkDirectMessagesReadMutationOptions(options));
    }

export const getGetDirectUnreadCountUrl = () => {




  return `/api/messages/unread-count`
}

export const getDirectUnreadCount = async ( options?: Parameters<typeof customFetch>[1]): Promise<DirectUnreadCount> => {

  return customFetch<DirectUnreadCount>(getGetDirectUnreadCountUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetDirectUnreadCountQueryKey = () => {
    return [
    `/api/messages/unread-count`
    ] as const;
    }


export const getGetDirectUnreadCountQueryOptions = <TData = Awaited<ReturnType<typeof getDirectUnreadCount>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getDirectUnreadCount>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetDirectUnreadCountQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getDirectUnreadCount>>> = ({ signal }) => getDirectUnreadCount({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getDirectUnreadCount>>, TError, TData> & { queryKey: QueryKey }
}

export type GetDirectUnreadCountQueryResult = NonNullable<Awaited<ReturnType<typeof getDirectUnreadCount>>>
export type GetDirectUnreadCountQueryError = ErrorType<unknown>



export function useGetDirectUnreadCount<TData = Awaited<ReturnType<typeof getDirectUnreadCount>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getDirectUnreadCount>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetDirectUnreadCountQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getBlockDirectMemberUrl = (memberId: string,) => {




  return `/api/messages/blocks/${memberId}`
}

export const blockDirectMember = async (memberId: string, options?: Parameters<typeof customFetch>[1]): Promise<DirectBlockResult> => {

  return customFetch<DirectBlockResult>(getBlockDirectMemberUrl(memberId),
  {
    ...options,
    method: 'PUT'


  }
);}





export const getBlockDirectMemberMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof blockDirectMember>>, TError,{memberId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof blockDirectMember>>, TError,{memberId: string}, TContext> => {

const mutationKey = ['blockDirectMember'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof blockDirectMember>>, {memberId: string}> = (props) => {
          const {memberId} = props ?? {};

          return  blockDirectMember(memberId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type BlockDirectMemberMutationResult = NonNullable<Awaited<ReturnType<typeof blockDirectMember>>>

    export type BlockDirectMemberMutationError = ErrorType<unknown>

    export const useBlockDirectMember = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof blockDirectMember>>, TError,{memberId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof blockDirectMember>>,
        TError,
        {memberId: string},
        TContext
      > => {
      return useMutation(getBlockDirectMemberMutationOptions(options));
    }

export const getUnblockDirectMemberUrl = (memberId: string,) => {




  return `/api/messages/blocks/${memberId}`
}

export const unblockDirectMember = async (memberId: string, options?: Parameters<typeof customFetch>[1]): Promise<DirectBlockResult> => {

  return customFetch<DirectBlockResult>(getUnblockDirectMemberUrl(memberId),
  {
    ...options,
    method: 'DELETE'


  }
);}





export const getUnblockDirectMemberMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof unblockDirectMember>>, TError,{memberId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof unblockDirectMember>>, TError,{memberId: string}, TContext> => {

const mutationKey = ['unblockDirectMember'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof unblockDirectMember>>, {memberId: string}> = (props) => {
          const {memberId} = props ?? {};

          return  unblockDirectMember(memberId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UnblockDirectMemberMutationResult = NonNullable<Awaited<ReturnType<typeof unblockDirectMember>>>

    export type UnblockDirectMemberMutationError = ErrorType<unknown>

    export const useUnblockDirectMember = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof unblockDirectMember>>, TError,{memberId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof unblockDirectMember>>,
        TError,
        {memberId: string},
        TContext
      > => {
      return useMutation(getUnblockDirectMemberMutationOptions(options));
    }

export const getUpdateDirectMessageTypingUrl = () => {




  return `/api/messages/typing`
}

export const updateDirectMessageTyping = async (directTypingInput: DirectTypingInput, options?: Parameters<typeof customFetch>[1]): Promise<DirectTypingResult> => {

  return customFetch<DirectTypingResult>(getUpdateDirectMessageTypingUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(directTypingInput)
  }
);}





export const getUpdateDirectMessageTypingMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateDirectMessageTyping>>, TError,{data: BodyType<DirectTypingInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateDirectMessageTyping>>, TError,{data: BodyType<DirectTypingInput>}, TContext> => {

const mutationKey = ['updateDirectMessageTyping'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateDirectMessageTyping>>, {data: BodyType<DirectTypingInput>}> = (props) => {
          const {data} = props ?? {};

          return  updateDirectMessageTyping(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateDirectMessageTypingMutationResult = NonNullable<Awaited<ReturnType<typeof updateDirectMessageTyping>>>
    export type UpdateDirectMessageTypingMutationBody = BodyType<DirectTypingInput>
    export type UpdateDirectMessageTypingMutationError = ErrorType<unknown>

    export const useUpdateDirectMessageTyping = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateDirectMessageTyping>>, TError,{data: BodyType<DirectTypingInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateDirectMessageTyping>>,
        TError,
        {data: BodyType<DirectTypingInput>},
        TContext
      > => {
      return useMutation(getUpdateDirectMessageTypingMutationOptions(options));
    }

