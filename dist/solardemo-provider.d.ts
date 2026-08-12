type SolardemoProviderOptions = {
    sdk?: Record<string, any>;
    test?: boolean;
    testopts?: Record<string, any>;
};
declare function SolardemoProvider(this: any, options: SolardemoProviderOptions): {
    exports: {
        sdk: () => any;
    };
};
export default SolardemoProvider;
