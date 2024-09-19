export type RestResultSuccess<T> = {
    success: true;
    data: T;
};

export type RestResultError = {
    success: false;
    error: string;
};

export type RestResult<T = null> = Promise<RestResultSuccess<T> | RestResultError>;
