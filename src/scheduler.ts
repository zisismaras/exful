import Vue from "vue";
import {Plugin} from "@nuxt/types";

/*
    Simple scheduling mechanism that can execute callbacks serially.
    Built on top of a Vue instance to take advantage of vue's reactivity.
    We use it to run store api requests 1 at a time as to avoid state mismatches. 
*/

type WrapperCb = () => Promise<void>;

const scheduler: Plugin = function(_context, inject) {
    const schedulerVM = new Vue({
        data(): {
            list: WrapperCb[],
            current: WrapperCb | null
            } {
            return {
                list: [],
                current: null
            };
        },
        methods: {
            schedule(cb: Function) {
                return new Promise((resolve, reject) => {
                    const wrapperCb = async() => {
                        try {
                            const result = await cb();
                            resolve(result);
                        } catch (e) {
                            reject(e);
                        }
                        this.next();
                    };
                    if (this.current) {
                        // console.log("scheduling");
                        this.list.push(wrapperCb);
                    } else {
                        // console.log("direct");
                        this.current = wrapperCb;
                    }
                });
            },
            next() {
                this.current = null;
                const current = this.list.shift();
                if (current) {
                    // console.log("running scheduled");
                    this.current = current;
                }
            }
        },
        watch: {
            async current() {
                if (!this.current) return;
                await this.current();
            }
        }
    });

    inject("schedule", function(cb: Function) {
        return schedulerVM.schedule(cb);
    });
};

export default scheduler;
