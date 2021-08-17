
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run$1(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run$1);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run$1).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\core\Grid.svelte generated by Svelte v3.38.3 */

    const file$b = "src\\core\\Grid.svelte";

    function create_fragment$d(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "my-grid svelte-1hqqd40");
    			set_style(div, "--areas", /*layout*/ ctx[0].areas);
    			set_style(div, "--cols", /*layout*/ ctx[0].cols);
    			set_style(div, "--rows", /*layout*/ ctx[0].rows);
    			add_location(div, file$b, 3, 0, 51);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*layout*/ 1) {
    				set_style(div, "--areas", /*layout*/ ctx[0].areas);
    			}

    			if (!current || dirty & /*layout*/ 1) {
    				set_style(div, "--cols", /*layout*/ ctx[0].cols);
    			}

    			if (!current || dirty & /*layout*/ 1) {
    				set_style(div, "--rows", /*layout*/ ctx[0].rows);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Grid", slots, ['default']);
    	let { layout } = $$props;
    	const writable_props = ["layout"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Grid> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("layout" in $$props) $$invalidate(0, layout = $$props.layout);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ layout });

    	$$self.$inject_state = $$props => {
    		if ("layout" in $$props) $$invalidate(0, layout = $$props.layout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [layout, $$scope, slots];
    }

    class Grid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { layout: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Grid",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*layout*/ ctx[0] === undefined && !("layout" in props)) {
    			console.warn("<Grid> was created without expected prop 'layout'");
    		}
    	}

    	get layout() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set layout(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\Logger.svelte generated by Svelte v3.38.3 */

    const file$a = "src\\core\\Logger.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (25:0) {#each lines as line}
    function create_each_block$2(ctx) {
    	let p;
    	let t_value = /*line*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$a, 25, 4, 600);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lines*/ 1 && t_value !== (t_value = /*line*/ ctx[1] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(25:0) {#each lines as line}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let each_1_anchor;
    	let each_value = /*lines*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*lines*/ 1) {
    				each_value = /*lines*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let _lines = [];

    let _refresh = () => {
    	
    };

    function log(level, msg, err) {
    	let line = `${level} ${msg}`;
    	if (err) line += ` (${err})`;
    	_lines.push(line);
    	_refresh();
    }

    function info(msg, err) {
    	log("I", msg, err === null || err === void 0 ? void 0 : err.message);
    }

    function error(msg, err) {
    	log("E", msg, err === null || err === void 0 ? void 0 : err.message);
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Logger", slots, []);
    	let lines = _lines;

    	_refresh = () => {
    		$$invalidate(0, lines = _lines);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Logger> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		_lines,
    		_refresh,
    		log,
    		info,
    		error,
    		lines
    	});

    	$$self.$inject_state = $$props => {
    		if ("lines" in $$props) $$invalidate(0, lines = $$props.lines);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [lines];
    }

    class Logger extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logger",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\core\Utils.svelte generated by Svelte v3.38.3 */

    function rand(min, max) {
    	min = Math.ceil(min);
    	max = Math.floor(max);
    	return Math.floor(Math.random() * (max - min) + min);
    }

    function randFrom(arr) {
    	return arr[rand(0, arr.length)];
    }

    function trueFalse() {
    	return rand(0, 2) == 0;
    }

    function shuffle(arr) {
    	for (let i = arr.length - 1; i > 0; i--) {
    		const j = Math.floor(Math.random() * (i + 1));
    		[arr[i], arr[j]] = [arr[j], arr[i]];
    	}
    }

    new AudioContext();

    function run(task) {
    	setTimeout(task, 0);
    }

    function delay(ms) {
    	return new Promise(resolve => setTimeout(resolve, ms));
    }

    function range(start, end) {
    	return Array.from({ length: end - start }, (_, k) => k + start);
    }

    /* src\core\IoBus.svelte generated by Svelte v3.38.3 */

    let callbacks = {};

    function onAny(name, cb) {
    	var _a;

    	let funcs = (_a = callbacks[name]) !== null && _a !== void 0
    	? _a
    	: [];

    	funcs.push(cb);
    	callbacks[name] = funcs;
    }

    function fireAny(name, args) {
    	var _a;

    	let funcs = (_a = callbacks[name]) !== null && _a !== void 0
    	? _a
    	: [];

    	funcs.forEach(func => setTimeout(() => func(args), 0));
    }

    /* src\core\TimedCmd.svelte generated by Svelte v3.38.3 */

    class CTimedCmd {
    	constructor(cmd, timeout, jitter) {
    		this._cmd = cmd;
    		this._timeout = timeout;
    		this._jitter = jitter;
    	}

    	set() {
    		let timeout = this._jitter === 0
    		? this._timeout
    		: rand(this._timeout - this._jitter, this._timeout + this._jitter);

    		this._timeoutId = setTimeout(() => fireAny(this._cmd, {}), timeout);
    	}

    	cancel() {
    		clearTimeout(this._timeoutId);
    	}

    	reset() {
    		this.cancel();
    		this.set();
    	}
    }

    /* src\plus-over\Model.svelte generated by Svelte v3.38.3 */



    function on(name, cb) {
    	onAny(name, cb);
    }

    function fire(name, args) {
    	fireAny(name, args);
    }

    function NewTimedCmd(cmd, timeout, jitter) {
    	return new CTimedCmd(cmd, timeout, jitter !== null && jitter !== void 0 ? jitter : 0);
    }

    /* src\core\Pulse.svelte generated by Svelte v3.38.3 */

    var __awaiter$1 = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    	function adopt(value) {
    		return value instanceof P
    		? value
    		: new P(function (resolve) {
    					resolve(value);
    				});
    	}

    	return new (P || (P = Promise))(function (resolve, reject) {
    			function fulfilled(value) {
    				try {
    					step(generator.next(value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function rejected(value) {
    				try {
    					step(generator["throw"](value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function step(result) {
    				result.done
    				? resolve(result.value)
    				: adopt(result.value).then(fulfilled, rejected);
    			}

    			step((generator = generator.apply(thisArg, _arguments || [])).next());
    		});
    };

    let Config = {
    	duration: 500,
    	interval: 10000,
    	jitter: 7000
    };

    let zoomOut = [
    	{ transform: "scale(1, 1)" },
    	{ transform: "scale(1.03, 1.03)" },
    	{ transform: "scale(1, 1)" }
    ];

    let zoomIn = [
    	{ transform: "scale(1, 1)" },
    	{ transform: "scale(0.98, 0.98)" },
    	{ transform: "scale(1, 1)" }
    ];

    let xShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(-1px, 0px)" },
    	{ transform: "translate(+1px, 0px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let yShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(0px, -1px)" },
    	{ transform: "translate(0px, +1px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let xyShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(-1px, -1px)" },
    	{ transform: "translate(+1px, +1px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let yxShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(+1px, -1px)" },
    	{ transform: "translate(-1px, +1px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let rotate = [
    	{ transform: "rotate(0deg)" },
    	{ transform: "rotate(-2deg)" },
    	{ transform: "rotate(+2deg)" },
    	{ transform: "rotate(0deg)" }
    ];

    let pulses = [zoomOut, zoomIn, xShift, yShift, xyShift, yxShift, rotate];

    function startPulsing(elem, config) {
    	return __awaiter$1(this, void 0, void 0, function* () {
    		for (; ; ) {
    			let { interval, jitter, duration } = Config;
    			let timeout = rand(interval - jitter, interval + jitter);
    			yield delay(timeout);
    			let pulse = randFrom(pulses);
    			elem.animate(pulse, duration);
    		}
    	});
    }

    function pulse(elem, config) {
    	run$1(() => startPulsing(elem));
    }

    /* src\core\Clock.svelte generated by Svelte v3.38.3 */
    const file$9 = "src\\core\\Clock.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (48:2) {#each [1, 2, 3, 4] as offset}
    function create_each_block_1(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "class", "minor svelte-drk22q");
    			attr_dev(line, "y1", "42");
    			attr_dev(line, "y2", "45");
    			attr_dev(line, "transform", "rotate(" + 6 * (/*minute*/ ctx[7] + /*offset*/ ctx[10]) + ")");
    			add_location(line, file$9, 48, 3, 1086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(48:2) {#each [1, 2, 3, 4] as offset}",
    		ctx
    	});

    	return block;
    }

    // (40:1) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}
    function create_each_block$1(ctx) {
    	let line;
    	let each_1_anchor;
    	let each_value_1 = [1, 2, 3, 4];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			line = svg_element("line");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(line, "class", "major svelte-drk22q");
    			attr_dev(line, "y1", "35");
    			attr_dev(line, "y2", "45");
    			attr_dev(line, "transform", "rotate(" + 30 * /*minute*/ ctx[7] + ")");
    			add_location(line, file$9, 40, 2, 954);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(40:1) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let svg;
    	let circle;
    	let circle_class_value;
    	let line0;
    	let line0_transform_value;
    	let line1;
    	let line1_transform_value;
    	let g;
    	let line2;
    	let line3;
    	let g_transform_value;
    	let mounted;
    	let dispose;
    	let each_value = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 12; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			circle = svg_element("circle");

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].c();
    			}

    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			g = svg_element("g");
    			line2 = svg_element("line");
    			line3 = svg_element("line");

    			attr_dev(circle, "class", circle_class_value = "" + (null_to_empty(/*soundOn*/ ctx[0]
    			? "clock-face-enabled"
    			: "clock-face-disabled") + " svelte-drk22q"));

    			attr_dev(circle, "r", "48");
    			add_location(circle, file$9, 36, 1, 783);
    			attr_dev(line0, "class", "hour svelte-drk22q");
    			attr_dev(line0, "y1", "2");
    			attr_dev(line0, "y2", "-20");
    			attr_dev(line0, "transform", line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[3] / 2) + ")");
    			add_location(line0, file$9, 58, 1, 1239);
    			attr_dev(line1, "class", "minute svelte-drk22q");
    			attr_dev(line1, "y1", "4");
    			attr_dev(line1, "y2", "-30");
    			attr_dev(line1, "transform", line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[3] + /*seconds*/ ctx[4] / 10) + ")");
    			add_location(line1, file$9, 66, 1, 1365);
    			attr_dev(line2, "class", "second svelte-drk22q");
    			attr_dev(line2, "y1", "10");
    			attr_dev(line2, "y2", "-38");
    			add_location(line2, file$9, 75, 2, 1536);
    			attr_dev(line3, "class", "second-counterweight svelte-drk22q");
    			attr_dev(line3, "y1", "10");
    			attr_dev(line3, "y2", "2");
    			add_location(line3, file$9, 76, 2, 1579);
    			attr_dev(g, "transform", g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[4] + ")");
    			add_location(g, file$9, 74, 1, 1495);
    			attr_dev(svg, "viewBox", "-50 -50 100 100");
    			set_style(svg, "grid-area", /*ga*/ ctx[1]);
    			attr_dev(svg, "class", "svelte-drk22q");
    			add_location(svg, file$9, 32, 0, 681);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, circle);

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, line0);
    			append_dev(svg, line1);
    			append_dev(svg, g);
    			append_dev(g, line2);
    			append_dev(g, line3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", /*soundSwitch*/ ctx[5], false, false, false),
    					action_destroyer(pulse.call(null, svg))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*soundOn*/ 1 && circle_class_value !== (circle_class_value = "" + (null_to_empty(/*soundOn*/ ctx[0]
    			? "clock-face-enabled"
    			: "clock-face-disabled") + " svelte-drk22q"))) {
    				attr_dev(circle, "class", circle_class_value);
    			}

    			if (dirty & /*hours, minutes*/ 12 && line0_transform_value !== (line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[3] / 2) + ")")) {
    				attr_dev(line0, "transform", line0_transform_value);
    			}

    			if (dirty & /*minutes, seconds*/ 24 && line1_transform_value !== (line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[3] + /*seconds*/ ctx[4] / 10) + ")")) {
    				attr_dev(line1, "transform", line1_transform_value);
    			}

    			if (dirty & /*seconds*/ 16 && g_transform_value !== (g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[4] + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty & /*ga*/ 2) {
    				set_style(svg, "grid-area", /*ga*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let hours;
    	let minutes;
    	let seconds;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Clock", slots, []);
    	let { ga } = $$props;
    	let { soundOn } = $$props;
    	let time = new Date();

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				$$invalidate(6, time = new Date());
    			},
    			1000
    		);

    		return () => {
    			clearInterval(interval);
    		};
    	});

    	function soundSwitch() {
    		$$invalidate(0, soundOn ^= true);
    		fire("--cmd-sound", { soundOn });
    	}

    	const writable_props = ["ga", "soundOn"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Clock> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(1, ga = $$props.ga);
    		if ("soundOn" in $$props) $$invalidate(0, soundOn = $$props.soundOn);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		fire,
    		pulse,
    		ga,
    		soundOn,
    		time,
    		soundSwitch,
    		hours,
    		minutes,
    		seconds
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(1, ga = $$props.ga);
    		if ("soundOn" in $$props) $$invalidate(0, soundOn = $$props.soundOn);
    		if ("time" in $$props) $$invalidate(6, time = $$props.time);
    		if ("hours" in $$props) $$invalidate(2, hours = $$props.hours);
    		if ("minutes" in $$props) $$invalidate(3, minutes = $$props.minutes);
    		if ("seconds" in $$props) $$invalidate(4, seconds = $$props.seconds);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 64) {
    			// these automatically update when `time`
    			// changes, because of the `$:` prefix
    			$$invalidate(2, hours = time.getHours());
    		}

    		if ($$self.$$.dirty & /*time*/ 64) {
    			$$invalidate(3, minutes = time.getMinutes());
    		}

    		if ($$self.$$.dirty & /*time*/ 64) {
    			$$invalidate(4, seconds = time.getSeconds());
    		}
    	};

    	return [soundOn, ga, hours, minutes, seconds, soundSwitch, time];
    }

    class Clock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { ga: 1, soundOn: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clock",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[1] === undefined && !("ga" in props)) {
    			console.warn("<Clock> was created without expected prop 'ga'");
    		}

    		if (/*soundOn*/ ctx[0] === undefined && !("soundOn" in props)) {
    			console.warn("<Clock> was created without expected prop 'soundOn'");
    		}
    	}

    	get ga() {
    		throw new Error("<Clock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Clock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get soundOn() {
    		throw new Error("<Clock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set soundOn(value) {
    		throw new Error("<Clock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\Mp3.svelte generated by Svelte v3.38.3 */

    const names = ["yes", "no", "done", "idle", "sound-on", "sound-off"];
    let _library = new Map();
    let _soundOn = true;

    function loadFrom(assetsFolder) {
    	function loadNext(folder, name, no) {
    		let fileName = folder === ""
    		? `${name}-${no}.mp3`
    		: `${folder}/${name}-${no}.mp3`;

    		let audio = new Audio(fileName);

    		audio.addEventListener(
    			"canplaythrough",
    			_ => {
    				console.log(`loaded: ${fileName}`);
    				let tracks = _library.get(name);
    				tracks.push(audio);
    				run(() => loadNext(folder, name, no + 1));
    			},
    			{ once: true }
    		);
    	}

    	names.forEach(name => {
    		console.log(`loading tracks of '${name}'`);
    		_library.set(name, []);
    		run(() => loadNext(assetsFolder, name, 1));
    	});
    }

    function play(name) {
    	let tracks = _library.get(name);
    	if (!tracks || tracks.length === 0) return;
    	let track = randFrom(tracks);
    	console.log(track);
    	track.play();
    }

    class CMp3 {
    	play(name) {
    		if (!_soundOn) return;
    		play(name);
    	}

    	buildMp3Library(assetsFolder, soundOn) {
    		_soundOn = soundOn;
    		run(() => loadFrom(""));
    		run(() => loadFrom(assetsFolder));
    	}

    	soundSwitch(soundOn) {
    		if (_soundOn === soundOn) return;
    		play(soundOn ? "sound-on" : "sound-off");
    		_soundOn = soundOn;
    	}
    }

    const Mp3 = new CMp3();

    /* src\plus-over\Settings.svelte generated by Svelte v3.38.3 */

    const Settings = {
    	noOfStarsAtCongrats: 120,
    	assetsFolder: "assets",
    	noOfPlusMinusRounds: 4,
    	soundOn: true
    };

    /* src\core\Anki.svelte generated by Svelte v3.38.3 */

    class CAnki {
    	hideLoader() {
    		let loader = document.getElementById("loader");
    		loader.style.display = "none";
    	}

    	getCard() {
    		return ankiCard;
    	}
    }

    const Anki = new CAnki();

    /* src\plus-over\PlusOver.svelte generated by Svelte v3.38.3 */


    let _game;
    let _tcNewRound = NewTimedCmd("--cmd-new-round", 1000);
    let _tcIdle = NewTimedCmd("--cmd-idle", 10000, 3000);
    let _settings = Settings;
    let _playbook = [];
    let _roundNo = -1;

    function getPair() {
    	let card = Anki.getCard();
    	return card.content.split(",").map(x => parseInt(x));
    }

    function addPlusRound() {
    	let pair = getPair();
    	let sumDigit = (pair[0] + pair[1]) % 10;
    	let op = "+";
    	let a0 = pair[0];
    	let a1 = rand(1, 9);
    	let a = 10 * a1 + a0;
    	let b0 = pair[1];
    	let b1 = rand(1, 10 - a1);
    	let b = 10 * b1 + b0;
    	let ans = a + b;
    	let nums = [a, b];
    	shuffle(nums);
    	let wrong1 = trueFalse() ? ans + rand(1, 10) : ans - rand(1, 10);
    	let wrong2 = ans > 50 ? ans - 10 : ans + 10;
    	let answers = [ans, wrong1, wrong2];
    	shuffle(answers);
    	let rightAt = answers.findIndex(x => x == ans);
    	_playbook.push({ nums, op, sumDigit, answers, rightAt });
    }

    function addMinusRound() {
    	let pair = getPair();
    	let sumDigit = (pair[0] + pair[1]) % 10;
    	let op = "-";
    	let a0 = pair[0];
    	let a1 = rand(1, 9);
    	let a = 10 * a1 + a0;
    	let b1 = rand(1, 10 - a1);
    	let b0 = pair[1];
    	let b = 10 * b1 + b0;
    	let sum = a + b;
    	let nums = [sum, trueFalse() ? a : b];
    	let ans = sum - nums[1];
    	let wrong1 = trueFalse() ? ans + rand(1, 10) : ans - rand(1, 10);
    	let wrong2 = ans > 50 ? ans - 10 : ans + 10;
    	let answers = [ans, wrong1, wrong2];
    	shuffle(answers);
    	let rightAt = answers.findIndex(x => x == ans);
    	_playbook.push({ nums, op, sumDigit, answers, rightAt });
    }

    for (let cnt = _settings.noOfPlusMinusRounds; cnt-- > 0; ) {
    	addPlusRound();
    	addMinusRound();
    }

    class CPlusOver {
    	getPair() {
    		return getPair();
    	}

    	newRound() {
    		_tcIdle.reset();
    		_tcNewRound.cancel();
    		_roundNo++;
    		if (_roundNo >= _playbook.length) error(`Round index out of bound: ${_roundNo} length=${_playbook.length}`);
    		let round = _playbook[_roundNo];
    		let count = _playbook.length - _roundNo;

    		_game = Object.assign(
    			{
    				roundsLeft: count,
    				clickedAt: 0,
    				state: "first-click"
    			},
    			round
    		);

    		fire("--cmd-update-views", _game);
    	}

    	gotClicked() {
    		switch (_game.state) {
    			case "first-click":
    				fire("--evt-answer");
    				break;
    			case "answered":
    				fire("--cmd-new-round");
    				break;
    		}
    	}

    	yesNo() {
    		if (_game.state !== "answered") return;
    		if (_game.roundsLeft <= 0) return;
    		let correct = _game.clickedAt === _game.rightAt;
    		fire(correct ? "--evt-yes" : "--evt-no");
    	}

    	gotAnswer(args) {
    		_tcIdle.reset();

    		switch (_game.state) {
    			case "first-click":
    				_game.state = "active";
    				break;
    			case "active":
    				_game.clickedAt = args.index;
    				_game.state = "answered";
    				this.yesNo();
    				break;
    			case "answered":
    				fire("--cmd-new-round");
    				return;
    		}

    		fire("--cmd-update-views", _game);
    	}

    	yes() {
    		if (_game.roundsLeft === 1) {
    			fire("--evt-done");
    		} else {
    			Mp3.play("yes");
    		}

    		_tcNewRound.reset();
    	}

    	no() {
    		Mp3.play("no");
    		addPlusRound();
    		addMinusRound();
    	}

    	done() {
    		Mp3.play("done");
    		addPlusRound();
    		addMinusRound();
    	}

    	idle() {
    		_tcIdle.reset();
    		Mp3.play("idle");
    	}

    	soundSwitch(args) {
    		Mp3.soundSwitch(args.soundOn);
    	}
    }

    const PlusOver = new CPlusOver();

    /* src\plus-over\Count.svelte generated by Svelte v3.38.3 */
    const file$8 = "src\\plus-over\\Count.svelte";

    function create_fragment$a(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_count*/ ctx[2]);
    			attr_dev(button, "class", "bg-purple-300");
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$8, 12, 0, 293);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_count*/ 4) set_data_dev(t, /*_count*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Count", slots, []);
    	
    	let _count;
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;

    	function updateView(game) {
    		$$invalidate(2, _count = game.roundsLeft.toString());
    	}

    	on("--cmd-update-views", updateView);
    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Count> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		on,
    		fire,
    		_count,
    		ga,
    		sz,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("_count" in $$props) $$invalidate(2, _count = $$props._count);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _count];
    }

    class Count extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Count> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Num.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\plus-over\\Num.svelte";

    function create_fragment$9(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_num*/ ctx[3]);
    			attr_dev(button, "class", /*bgColor*/ ctx[1]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[2]);
    			add_location(button, file$7, 17, 0, 381);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_num*/ 8) set_data_dev(t, /*_num*/ ctx[3]);

    			if (dirty & /*bgColor*/ 2) {
    				attr_dev(button, "class", /*bgColor*/ ctx[1]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 4) {
    				set_style(button, "font-size", /*sz*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Num", slots, []);
    	
    	let _num;
    	let { ga } = $$props;
    	let { bgColor } = $$props;
    	let { index } = $$props;
    	let { sz = "30px" } = $$props;

    	function onClick() {
    		fire("--evt-click");
    	}

    	function updateView(game) {
    		$$invalidate(3, _num = game.nums[index].toString());
    	}

    	on("--cmd-update-views", updateView);
    	const writable_props = ["ga", "bgColor", "index", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Num> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		on,
    		fire,
    		pulse,
    		_num,
    		ga,
    		bgColor,
    		index,
    		sz,
    		onClick,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("_num" in $$props) $$invalidate(3, _num = $$props._num);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, bgColor, sz, _num, onClick, index];
    }

    class Num extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { ga: 0, bgColor: 1, index: 5, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Num> was created without expected prop 'ga'");
    		}

    		if (/*bgColor*/ ctx[1] === undefined && !("bgColor" in props)) {
    			console.warn("<Num> was created without expected prop 'bgColor'");
    		}

    		if (/*index*/ ctx[5] === undefined && !("index" in props)) {
    			console.warn("<Num> was created without expected prop 'index'");
    		}
    	}

    	get ga() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Op.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\plus-over\\Op.svelte";

    function create_fragment$8(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_op*/ ctx[3]);
    			attr_dev(button, "class", /*bgColor*/ ctx[1]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[2]);
    			add_location(button, file$6, 18, 0, 464);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_op*/ 8) set_data_dev(t, /*_op*/ ctx[3]);

    			if (dirty & /*bgColor*/ 2) {
    				attr_dev(button, "class", /*bgColor*/ ctx[1]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 4) {
    				set_style(button, "font-size", /*sz*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Op", slots, []);
    	
    	let { ga } = $$props;
    	let { bgColor } = $$props;
    	let { sz = "30px" } = $$props;
    	let _op = "+";

    	function onClick() {
    		Mp3.play(randFrom(["yes", "no", "idle"]));
    	}

    	function updateView(game) {
    		$$invalidate(3, _op = game.op);
    	}

    	on("--cmd-update-views", updateView);
    	const writable_props = ["ga", "bgColor", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Op> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		on,
    		fire,
    		randFrom,
    		pulse,
    		Mp3,
    		ga,
    		bgColor,
    		sz,
    		_op,
    		onClick,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    		if ("_op" in $$props) $$invalidate(3, _op = $$props._op);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, bgColor, sz, _op, onClick];
    }

    class Op extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { ga: 0, bgColor: 1, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Op",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Op> was created without expected prop 'ga'");
    		}

    		if (/*bgColor*/ ctx[1] === undefined && !("bgColor" in props)) {
    			console.warn("<Op> was created without expected prop 'bgColor'");
    		}
    	}

    	get ga() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Ans.svelte generated by Svelte v3.38.3 */
    const file$5 = "src\\plus-over\\Ans.svelte";

    function create_fragment$7(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_text*/ ctx[2]);
    			attr_dev(button, "class", /*_class*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$5, 34, 0, 861);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_text*/ 4) set_data_dev(t, /*_text*/ ctx[2]);

    			if (dirty & /*_class*/ 8) {
    				attr_dev(button, "class", /*_class*/ ctx[3]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Ans", slots, []);
    	
    	let _text;
    	let _class;
    	let { ga } = $$props;
    	let { index } = $$props;
    	let { sz = "30px" } = $$props;

    	function onClick() {
    		fire("--evt-answer", { index });
    	}

    	function getText(game) {
    		if (game.state === "first-click") return "??";
    		return game.answers[index].toString();
    	}

    	function getClass(game) {
    		if (game.state === "first-click") return "bg-gray-100";
    		if (game.state === "active") return "bg-orange-200";
    		if (game.rightAt === index) return "bg-green-200";
    		if (game.clickedAt !== index) return "bg-gray-100";
    		return "bg-red-200";
    	}

    	function updateView(game) {
    		$$invalidate(2, _text = getText(game));
    		$$invalidate(3, _class = getClass(game));
    	}

    	on("--cmd-update-views", updateView);
    	const writable_props = ["ga", "index", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ans> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		on,
    		fire,
    		_text,
    		_class,
    		ga,
    		index,
    		sz,
    		onClick,
    		getText,
    		getClass,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("_text" in $$props) $$invalidate(2, _text = $$props._text);
    		if ("_class" in $$props) $$invalidate(3, _class = $$props._class);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _text, _class, onClick, index];
    }

    class Ans extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { ga: 0, index: 5, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ans",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Ans> was created without expected prop 'ga'");
    		}

    		if (/*index*/ ctx[5] === undefined && !("index" in props)) {
    			console.warn("<Ans> was created without expected prop 'index'");
    		}
    	}

    	get ga() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Pair.svelte generated by Svelte v3.38.3 */
    const file$4 = "src\\plus-over\\Pair.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let button0;
    	let t0_value = /*pair*/ ctx[1][0] + "";
    	let t0;
    	let t1;
    	let button1;
    	let t2_value = /*pair*/ ctx[1][1] + "";
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			button1 = element("button");
    			t2 = text(t2_value);
    			attr_dev(button0, "class", /*bgColor*/ ctx[2]);
    			add_location(button0, file$4, 8, 4, 207);
    			attr_dev(button1, "class", /*bgColor*/ ctx[2]);
    			add_location(button1, file$4, 14, 4, 304);
    			set_style(div, "grid-area", /*ga*/ ctx[0]);
    			set_style(div, "font-size", /*sz*/ ctx[3]);
    			add_location(div, file$4, 7, 0, 158);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(button0, t0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button0)),
    					action_destroyer(pulse.call(null, button1))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pair*/ 2 && t0_value !== (t0_value = /*pair*/ ctx[1][0] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*bgColor*/ 4) {
    				attr_dev(button0, "class", /*bgColor*/ ctx[2]);
    			}

    			if (dirty & /*pair*/ 2 && t2_value !== (t2_value = /*pair*/ ctx[1][1] + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*bgColor*/ 4) {
    				attr_dev(button1, "class", /*bgColor*/ ctx[2]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(div, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 8) {
    				set_style(div, "font-size", /*sz*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Pair", slots, []);
    	let { ga } = $$props;
    	let { pair } = $$props;
    	let { bgColor } = $$props;
    	let { sz = "15px" } = $$props;
    	const writable_props = ["ga", "pair", "bgColor", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Pair> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("pair" in $$props) $$invalidate(1, pair = $$props.pair);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(3, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({ pulse, ga, pair, bgColor, sz });

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("pair" in $$props) $$invalidate(1, pair = $$props.pair);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(3, sz = $$props.sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, pair, bgColor, sz];
    }

    class Pair extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { ga: 0, pair: 1, bgColor: 2, sz: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pair",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Pair> was created without expected prop 'ga'");
    		}

    		if (/*pair*/ ctx[1] === undefined && !("pair" in props)) {
    			console.warn("<Pair> was created without expected prop 'pair'");
    		}

    		if (/*bgColor*/ ctx[2] === undefined && !("bgColor" in props)) {
    			console.warn("<Pair> was created without expected prop 'bgColor'");
    		}
    	}

    	get ga() {
    		throw new Error("<Pair>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Pair>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pair() {
    		throw new Error("<Pair>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pair(value) {
    		throw new Error("<Pair>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<Pair>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Pair>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Pair>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Pair>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Digit.svelte generated by Svelte v3.38.3 */
    const file$3 = "src\\plus-over\\Digit.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t = text(/*_digit*/ ctx[3]);
    			attr_dev(button, "class", /*bgColor*/ ctx[1]);
    			add_location(button, file$3, 13, 4, 346);
    			set_style(div, "grid-area", /*ga*/ ctx[0]);
    			set_style(div, "font-size", /*sz*/ ctx[2]);
    			add_location(div, file$3, 12, 0, 297);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_digit*/ 8) set_data_dev(t, /*_digit*/ ctx[3]);

    			if (dirty & /*bgColor*/ 2) {
    				attr_dev(button, "class", /*bgColor*/ ctx[1]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(div, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 4) {
    				set_style(div, "font-size", /*sz*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Digit", slots, []);
    	let { ga } = $$props;
    	let { bgColor } = $$props;
    	let { sz = "15px" } = $$props;
    	let _digit;

    	function updateView(game) {
    		$$invalidate(3, _digit = game.sumDigit);
    	}

    	on("--cmd-update-views", updateView);
    	const writable_props = ["ga", "bgColor", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Digit> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		on,
    		fire,
    		ga,
    		bgColor,
    		sz,
    		_digit,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    		if ("_digit" in $$props) $$invalidate(3, _digit = $$props._digit);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, bgColor, sz, _digit];
    }

    class Digit extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { ga: 0, bgColor: 1, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Digit",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Digit> was created without expected prop 'ga'");
    		}

    		if (/*bgColor*/ ctx[1] === undefined && !("bgColor" in props)) {
    			console.warn("<Digit> was created without expected prop 'bgColor'");
    		}
    	}

    	get ga() {
    		throw new Error("<Digit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Digit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<Digit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Digit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Digit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Digit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*
     * anime.js v3.2.1
     * (c) 2020 Julian Garnier
     * Released under the MIT license
     * animejs.com
     */

    // Defaults

    var defaultInstanceSettings = {
      update: null,
      begin: null,
      loopBegin: null,
      changeBegin: null,
      change: null,
      changeComplete: null,
      loopComplete: null,
      complete: null,
      loop: 1,
      direction: 'normal',
      autoplay: true,
      timelineOffset: 0
    };

    var defaultTweenSettings = {
      duration: 1000,
      delay: 0,
      endDelay: 0,
      easing: 'easeOutElastic(1, .5)',
      round: 0
    };

    var validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skew', 'skewX', 'skewY', 'perspective', 'matrix', 'matrix3d'];

    // Caching

    var cache = {
      CSS: {},
      springs: {}
    };

    // Utils

    function minMax(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    function stringContains(str, text) {
      return str.indexOf(text) > -1;
    }

    function applyArguments(func, args) {
      return func.apply(null, args);
    }

    var is = {
      arr: function (a) { return Array.isArray(a); },
      obj: function (a) { return stringContains(Object.prototype.toString.call(a), 'Object'); },
      pth: function (a) { return is.obj(a) && a.hasOwnProperty('totalLength'); },
      svg: function (a) { return a instanceof SVGElement; },
      inp: function (a) { return a instanceof HTMLInputElement; },
      dom: function (a) { return a.nodeType || is.svg(a); },
      str: function (a) { return typeof a === 'string'; },
      fnc: function (a) { return typeof a === 'function'; },
      und: function (a) { return typeof a === 'undefined'; },
      nil: function (a) { return is.und(a) || a === null; },
      hex: function (a) { return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a); },
      rgb: function (a) { return /^rgb/.test(a); },
      hsl: function (a) { return /^hsl/.test(a); },
      col: function (a) { return (is.hex(a) || is.rgb(a) || is.hsl(a)); },
      key: function (a) { return !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'; },
    };

    // Easings

    function parseEasingParameters(string) {
      var match = /\(([^)]+)\)/.exec(string);
      return match ? match[1].split(',').map(function (p) { return parseFloat(p); }) : [];
    }

    // Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

    function spring(string, duration) {

      var params = parseEasingParameters(string);
      var mass = minMax(is.und(params[0]) ? 1 : params[0], .1, 100);
      var stiffness = minMax(is.und(params[1]) ? 100 : params[1], .1, 100);
      var damping = minMax(is.und(params[2]) ? 10 : params[2], .1, 100);
      var velocity =  minMax(is.und(params[3]) ? 0 : params[3], .1, 100);
      var w0 = Math.sqrt(stiffness / mass);
      var zeta = damping / (2 * Math.sqrt(stiffness * mass));
      var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
      var a = 1;
      var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

      function solver(t) {
        var progress = duration ? (duration * t) / 1000 : t;
        if (zeta < 1) {
          progress = Math.exp(-progress * zeta * w0) * (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
        } else {
          progress = (a + b * progress) * Math.exp(-progress * w0);
        }
        if (t === 0 || t === 1) { return t; }
        return 1 - progress;
      }

      function getDuration() {
        var cached = cache.springs[string];
        if (cached) { return cached; }
        var frame = 1/6;
        var elapsed = 0;
        var rest = 0;
        while(true) {
          elapsed += frame;
          if (solver(elapsed) === 1) {
            rest++;
            if (rest >= 16) { break; }
          } else {
            rest = 0;
          }
        }
        var duration = elapsed * frame * 1000;
        cache.springs[string] = duration;
        return duration;
      }

      return duration ? solver : getDuration;

    }

    // Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

    function steps(steps) {
      if ( steps === void 0 ) steps = 10;

      return function (t) { return Math.ceil((minMax(t, 0.000001, 1)) * steps) * (1 / steps); };
    }

    // BezierEasing https://github.com/gre/bezier-easing

    var bezier = (function () {

      var kSplineTableSize = 11;
      var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

      function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
      function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
      function C(aA1)      { return 3.0 * aA1 }

      function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
      function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }

      function binarySubdivide(aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
          currentT = aA + (aB - aA) / 2.0;
          currentX = calcBezier(currentT, mX1, mX2) - aX;
          if (currentX > 0.0) { aB = currentT; } else { aA = currentT; }
        } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
        return currentT;
      }

      function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < 4; ++i) {
          var currentSlope = getSlope(aGuessT, mX1, mX2);
          if (currentSlope === 0.0) { return aGuessT; }
          var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
          aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
      }

      function bezier(mX1, mY1, mX2, mY2) {

        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) { return; }
        var sampleValues = new Float32Array(kSplineTableSize);

        if (mX1 !== mY1 || mX2 !== mY2) {
          for (var i = 0; i < kSplineTableSize; ++i) {
            sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
          }
        }

        function getTForX(aX) {

          var intervalStart = 0;
          var currentSample = 1;
          var lastSample = kSplineTableSize - 1;

          for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
            intervalStart += kSampleStepSize;
          }

          --currentSample;

          var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
          var guessForT = intervalStart + dist * kSampleStepSize;
          var initialSlope = getSlope(guessForT, mX1, mX2);

          if (initialSlope >= 0.001) {
            return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
          } else if (initialSlope === 0.0) {
            return guessForT;
          } else {
            return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
          }

        }

        return function (x) {
          if (mX1 === mY1 && mX2 === mY2) { return x; }
          if (x === 0 || x === 1) { return x; }
          return calcBezier(getTForX(x), mY1, mY2);
        }

      }

      return bezier;

    })();

    var penner = (function () {

      // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

      var eases = { linear: function () { return function (t) { return t; }; } };

      var functionEasings = {
        Sine: function () { return function (t) { return 1 - Math.cos(t * Math.PI / 2); }; },
        Circ: function () { return function (t) { return 1 - Math.sqrt(1 - t * t); }; },
        Back: function () { return function (t) { return t * t * (3 * t - 2); }; },
        Bounce: function () { return function (t) {
          var pow2, b = 4;
          while (t < (( pow2 = Math.pow(2, --b)) - 1) / 11) {}
          return 1 / Math.pow(4, 3 - b) - 7.5625 * Math.pow(( pow2 * 3 - 2 ) / 22 - t, 2)
        }; },
        Elastic: function (amplitude, period) {
          if ( amplitude === void 0 ) amplitude = 1;
          if ( period === void 0 ) period = .5;

          var a = minMax(amplitude, 1, 10);
          var p = minMax(period, .1, 2);
          return function (t) {
            return (t === 0 || t === 1) ? t : 
              -a * Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2) * Math.asin(1 / a))) * (Math.PI * 2)) / p);
          }
        }
      };

      var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'];

      baseEasings.forEach(function (name, i) {
        functionEasings[name] = function () { return function (t) { return Math.pow(t, i + 2); }; };
      });

      Object.keys(functionEasings).forEach(function (name) {
        var easeIn = functionEasings[name];
        eases['easeIn' + name] = easeIn;
        eases['easeOut' + name] = function (a, b) { return function (t) { return 1 - easeIn(a, b)(1 - t); }; };
        eases['easeInOut' + name] = function (a, b) { return function (t) { return t < 0.5 ? easeIn(a, b)(t * 2) / 2 : 
          1 - easeIn(a, b)(t * -2 + 2) / 2; }; };
        eases['easeOutIn' + name] = function (a, b) { return function (t) { return t < 0.5 ? (1 - easeIn(a, b)(1 - t * 2)) / 2 : 
          (easeIn(a, b)(t * 2 - 1) + 1) / 2; }; };
      });

      return eases;

    })();

    function parseEasings(easing, duration) {
      if (is.fnc(easing)) { return easing; }
      var name = easing.split('(')[0];
      var ease = penner[name];
      var args = parseEasingParameters(easing);
      switch (name) {
        case 'spring' : return spring(easing, duration);
        case 'cubicBezier' : return applyArguments(bezier, args);
        case 'steps' : return applyArguments(steps, args);
        default : return applyArguments(ease, args);
      }
    }

    // Strings

    function selectString(str) {
      try {
        var nodes = document.querySelectorAll(str);
        return nodes;
      } catch(e) {
        return;
      }
    }

    // Arrays

    function filterArray(arr, callback) {
      var len = arr.length;
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      var result = [];
      for (var i = 0; i < len; i++) {
        if (i in arr) {
          var val = arr[i];
          if (callback.call(thisArg, val, i, arr)) {
            result.push(val);
          }
        }
      }
      return result;
    }

    function flattenArray(arr) {
      return arr.reduce(function (a, b) { return a.concat(is.arr(b) ? flattenArray(b) : b); }, []);
    }

    function toArray(o) {
      if (is.arr(o)) { return o; }
      if (is.str(o)) { o = selectString(o) || o; }
      if (o instanceof NodeList || o instanceof HTMLCollection) { return [].slice.call(o); }
      return [o];
    }

    function arrayContains(arr, val) {
      return arr.some(function (a) { return a === val; });
    }

    // Objects

    function cloneObject(o) {
      var clone = {};
      for (var p in o) { clone[p] = o[p]; }
      return clone;
    }

    function replaceObjectProps(o1, o2) {
      var o = cloneObject(o1);
      for (var p in o1) { o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p]; }
      return o;
    }

    function mergeObjects(o1, o2) {
      var o = cloneObject(o1);
      for (var p in o2) { o[p] = is.und(o1[p]) ? o2[p] : o1[p]; }
      return o;
    }

    // Colors

    function rgbToRgba(rgbValue) {
      var rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
      return rgb ? ("rgba(" + (rgb[1]) + ",1)") : rgbValue;
    }

    function hexToRgba(hexValue) {
      var rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      var hex = hexValue.replace(rgx, function (m, r, g, b) { return r + r + g + g + b + b; } );
      var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(rgb[1], 16);
      var g = parseInt(rgb[2], 16);
      var b = parseInt(rgb[3], 16);
      return ("rgba(" + r + "," + g + "," + b + ",1)");
    }

    function hslToRgba(hslValue) {
      var hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
      var h = parseInt(hsl[1], 10) / 360;
      var s = parseInt(hsl[2], 10) / 100;
      var l = parseInt(hsl[3], 10) / 100;
      var a = hsl[4] || 1;
      function hue2rgb(p, q, t) {
        if (t < 0) { t += 1; }
        if (t > 1) { t -= 1; }
        if (t < 1/6) { return p + (q - p) * 6 * t; }
        if (t < 1/2) { return q; }
        if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
        return p;
      }
      var r, g, b;
      if (s == 0) {
        r = g = b = l;
      } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return ("rgba(" + (r * 255) + "," + (g * 255) + "," + (b * 255) + "," + a + ")");
    }

    function colorToRgb(val) {
      if (is.rgb(val)) { return rgbToRgba(val); }
      if (is.hex(val)) { return hexToRgba(val); }
      if (is.hsl(val)) { return hslToRgba(val); }
    }

    // Units

    function getUnit(val) {
      var split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
      if (split) { return split[1]; }
    }

    function getTransformUnit(propName) {
      if (stringContains(propName, 'translate') || propName === 'perspective') { return 'px'; }
      if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) { return 'deg'; }
    }

    // Values

    function getFunctionValue(val, animatable) {
      if (!is.fnc(val)) { return val; }
      return val(animatable.target, animatable.id, animatable.total);
    }

    function getAttribute(el, prop) {
      return el.getAttribute(prop);
    }

    function convertPxToUnit(el, value, unit) {
      var valueUnit = getUnit(value);
      if (arrayContains([unit, 'deg', 'rad', 'turn'], valueUnit)) { return value; }
      var cached = cache.CSS[value + unit];
      if (!is.und(cached)) { return cached; }
      var baseline = 100;
      var tempEl = document.createElement(el.tagName);
      var parentEl = (el.parentNode && (el.parentNode !== document)) ? el.parentNode : document.body;
      parentEl.appendChild(tempEl);
      tempEl.style.position = 'absolute';
      tempEl.style.width = baseline + unit;
      var factor = baseline / tempEl.offsetWidth;
      parentEl.removeChild(tempEl);
      var convertedUnit = factor * parseFloat(value);
      cache.CSS[value + unit] = convertedUnit;
      return convertedUnit;
    }

    function getCSSValue(el, prop, unit) {
      if (prop in el.style) {
        var uppercasePropName = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        var value = el.style[prop] || getComputedStyle(el).getPropertyValue(uppercasePropName) || '0';
        return unit ? convertPxToUnit(el, value, unit) : value;
      }
    }

    function getAnimationType(el, prop) {
      if (is.dom(el) && !is.inp(el) && (!is.nil(getAttribute(el, prop)) || (is.svg(el) && el[prop]))) { return 'attribute'; }
      if (is.dom(el) && arrayContains(validTransforms, prop)) { return 'transform'; }
      if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) { return 'css'; }
      if (el[prop] != null) { return 'object'; }
    }

    function getElementTransforms(el) {
      if (!is.dom(el)) { return; }
      var str = el.style.transform || '';
      var reg  = /(\w+)\(([^)]*)\)/g;
      var transforms = new Map();
      var m; while (m = reg.exec(str)) { transforms.set(m[1], m[2]); }
      return transforms;
    }

    function getTransformValue(el, propName, animatable, unit) {
      var defaultVal = stringContains(propName, 'scale') ? 1 : 0 + getTransformUnit(propName);
      var value = getElementTransforms(el).get(propName) || defaultVal;
      if (animatable) {
        animatable.transforms.list.set(propName, value);
        animatable.transforms['last'] = propName;
      }
      return unit ? convertPxToUnit(el, value, unit) : value;
    }

    function getOriginalTargetValue(target, propName, unit, animatable) {
      switch (getAnimationType(target, propName)) {
        case 'transform': return getTransformValue(target, propName, animatable, unit);
        case 'css': return getCSSValue(target, propName, unit);
        case 'attribute': return getAttribute(target, propName);
        default: return target[propName] || 0;
      }
    }

    function getRelativeValue(to, from) {
      var operator = /^(\*=|\+=|-=)/.exec(to);
      if (!operator) { return to; }
      var u = getUnit(to) || 0;
      var x = parseFloat(from);
      var y = parseFloat(to.replace(operator[0], ''));
      switch (operator[0][0]) {
        case '+': return x + y + u;
        case '-': return x - y + u;
        case '*': return x * y + u;
      }
    }

    function validateValue(val, unit) {
      if (is.col(val)) { return colorToRgb(val); }
      if (/\s/g.test(val)) { return val; }
      var originalUnit = getUnit(val);
      var unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
      if (unit) { return unitLess + unit; }
      return unitLess;
    }

    // getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
    // adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

    function getDistance(p1, p2) {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    function getCircleLength(el) {
      return Math.PI * 2 * getAttribute(el, 'r');
    }

    function getRectLength(el) {
      return (getAttribute(el, 'width') * 2) + (getAttribute(el, 'height') * 2);
    }

    function getLineLength(el) {
      return getDistance(
        {x: getAttribute(el, 'x1'), y: getAttribute(el, 'y1')}, 
        {x: getAttribute(el, 'x2'), y: getAttribute(el, 'y2')}
      );
    }

    function getPolylineLength(el) {
      var points = el.points;
      var totalLength = 0;
      var previousPos;
      for (var i = 0 ; i < points.numberOfItems; i++) {
        var currentPos = points.getItem(i);
        if (i > 0) { totalLength += getDistance(previousPos, currentPos); }
        previousPos = currentPos;
      }
      return totalLength;
    }

    function getPolygonLength(el) {
      var points = el.points;
      return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
    }

    // Path animation

    function getTotalLength(el) {
      if (el.getTotalLength) { return el.getTotalLength(); }
      switch(el.tagName.toLowerCase()) {
        case 'circle': return getCircleLength(el);
        case 'rect': return getRectLength(el);
        case 'line': return getLineLength(el);
        case 'polyline': return getPolylineLength(el);
        case 'polygon': return getPolygonLength(el);
      }
    }

    function setDashoffset(el) {
      var pathLength = getTotalLength(el);
      el.setAttribute('stroke-dasharray', pathLength);
      return pathLength;
    }

    // Motion path

    function getParentSvgEl(el) {
      var parentEl = el.parentNode;
      while (is.svg(parentEl)) {
        if (!is.svg(parentEl.parentNode)) { break; }
        parentEl = parentEl.parentNode;
      }
      return parentEl;
    }

    function getParentSvg(pathEl, svgData) {
      var svg = svgData || {};
      var parentSvgEl = svg.el || getParentSvgEl(pathEl);
      var rect = parentSvgEl.getBoundingClientRect();
      var viewBoxAttr = getAttribute(parentSvgEl, 'viewBox');
      var width = rect.width;
      var height = rect.height;
      var viewBox = svg.viewBox || (viewBoxAttr ? viewBoxAttr.split(' ') : [0, 0, width, height]);
      return {
        el: parentSvgEl,
        viewBox: viewBox,
        x: viewBox[0] / 1,
        y: viewBox[1] / 1,
        w: width,
        h: height,
        vW: viewBox[2],
        vH: viewBox[3]
      }
    }

    function getPath(path, percent) {
      var pathEl = is.str(path) ? selectString(path)[0] : path;
      var p = percent || 100;
      return function(property) {
        return {
          property: property,
          el: pathEl,
          svg: getParentSvg(pathEl),
          totalLength: getTotalLength(pathEl) * (p / 100)
        }
      }
    }

    function getPathProgress(path, progress, isPathTargetInsideSVG) {
      function point(offset) {
        if ( offset === void 0 ) offset = 0;

        var l = progress + offset >= 1 ? progress + offset : 0;
        return path.el.getPointAtLength(l);
      }
      var svg = getParentSvg(path.el, path.svg);
      var p = point();
      var p0 = point(-1);
      var p1 = point(+1);
      var scaleX = isPathTargetInsideSVG ? 1 : svg.w / svg.vW;
      var scaleY = isPathTargetInsideSVG ? 1 : svg.h / svg.vH;
      switch (path.property) {
        case 'x': return (p.x - svg.x) * scaleX;
        case 'y': return (p.y - svg.y) * scaleY;
        case 'angle': return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      }
    }

    // Decompose value

    function decomposeValue(val, unit) {
      // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
      // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
      var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
      var value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
      return {
        original: value,
        numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
        strings: (is.str(val) || unit) ? value.split(rgx) : []
      }
    }

    // Animatables

    function parseTargets(targets) {
      var targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
      return filterArray(targetsArray, function (item, pos, self) { return self.indexOf(item) === pos; });
    }

    function getAnimatables(targets) {
      var parsed = parseTargets(targets);
      return parsed.map(function (t, i) {
        return {target: t, id: i, total: parsed.length, transforms: { list: getElementTransforms(t) } };
      });
    }

    // Properties

    function normalizePropertyTweens(prop, tweenSettings) {
      var settings = cloneObject(tweenSettings);
      // Override duration if easing is a spring
      if (/^spring/.test(settings.easing)) { settings.duration = spring(settings.easing); }
      if (is.arr(prop)) {
        var l = prop.length;
        var isFromTo = (l === 2 && !is.obj(prop[0]));
        if (!isFromTo) {
          // Duration divided by the number of tweens
          if (!is.fnc(tweenSettings.duration)) { settings.duration = tweenSettings.duration / l; }
        } else {
          // Transform [from, to] values shorthand to a valid tween value
          prop = {value: prop};
        }
      }
      var propArray = is.arr(prop) ? prop : [prop];
      return propArray.map(function (v, i) {
        var obj = (is.obj(v) && !is.pth(v)) ? v : {value: v};
        // Default delay value should only be applied to the first tween
        if (is.und(obj.delay)) { obj.delay = !i ? tweenSettings.delay : 0; }
        // Default endDelay value should only be applied to the last tween
        if (is.und(obj.endDelay)) { obj.endDelay = i === propArray.length - 1 ? tweenSettings.endDelay : 0; }
        return obj;
      }).map(function (k) { return mergeObjects(k, settings); });
    }


    function flattenKeyframes(keyframes) {
      var propertyNames = filterArray(flattenArray(keyframes.map(function (key) { return Object.keys(key); })), function (p) { return is.key(p); })
      .reduce(function (a,b) { if (a.indexOf(b) < 0) { a.push(b); } return a; }, []);
      var properties = {};
      var loop = function ( i ) {
        var propName = propertyNames[i];
        properties[propName] = keyframes.map(function (key) {
          var newKey = {};
          for (var p in key) {
            if (is.key(p)) {
              if (p == propName) { newKey.value = key[p]; }
            } else {
              newKey[p] = key[p];
            }
          }
          return newKey;
        });
      };

      for (var i = 0; i < propertyNames.length; i++) loop( i );
      return properties;
    }

    function getProperties(tweenSettings, params) {
      var properties = [];
      var keyframes = params.keyframes;
      if (keyframes) { params = mergeObjects(flattenKeyframes(keyframes), params); }
      for (var p in params) {
        if (is.key(p)) {
          properties.push({
            name: p,
            tweens: normalizePropertyTweens(params[p], tweenSettings)
          });
        }
      }
      return properties;
    }

    // Tweens

    function normalizeTweenValues(tween, animatable) {
      var t = {};
      for (var p in tween) {
        var value = getFunctionValue(tween[p], animatable);
        if (is.arr(value)) {
          value = value.map(function (v) { return getFunctionValue(v, animatable); });
          if (value.length === 1) { value = value[0]; }
        }
        t[p] = value;
      }
      t.duration = parseFloat(t.duration);
      t.delay = parseFloat(t.delay);
      return t;
    }

    function normalizeTweens(prop, animatable) {
      var previousTween;
      return prop.tweens.map(function (t) {
        var tween = normalizeTweenValues(t, animatable);
        var tweenValue = tween.value;
        var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
        var toUnit = getUnit(to);
        var originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable);
        var previousValue = previousTween ? previousTween.to.original : originalValue;
        var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
        var fromUnit = getUnit(from) || getUnit(originalValue);
        var unit = toUnit || fromUnit;
        if (is.und(to)) { to = previousValue; }
        tween.from = decomposeValue(from, unit);
        tween.to = decomposeValue(getRelativeValue(to, from), unit);
        tween.start = previousTween ? previousTween.end : 0;
        tween.end = tween.start + tween.delay + tween.duration + tween.endDelay;
        tween.easing = parseEasings(tween.easing, tween.duration);
        tween.isPath = is.pth(tweenValue);
        tween.isPathTargetInsideSVG = tween.isPath && is.svg(animatable.target);
        tween.isColor = is.col(tween.from.original);
        if (tween.isColor) { tween.round = 1; }
        previousTween = tween;
        return tween;
      });
    }

    // Tween progress

    var setProgressValue = {
      css: function (t, p, v) { return t.style[p] = v; },
      attribute: function (t, p, v) { return t.setAttribute(p, v); },
      object: function (t, p, v) { return t[p] = v; },
      transform: function (t, p, v, transforms, manual) {
        transforms.list.set(p, v);
        if (p === transforms.last || manual) {
          var str = '';
          transforms.list.forEach(function (value, prop) { str += prop + "(" + value + ") "; });
          t.style.transform = str;
        }
      }
    };

    // Set Value helper

    function setTargetsValue(targets, properties) {
      var animatables = getAnimatables(targets);
      animatables.forEach(function (animatable) {
        for (var property in properties) {
          var value = getFunctionValue(properties[property], animatable);
          var target = animatable.target;
          var valueUnit = getUnit(value);
          var originalValue = getOriginalTargetValue(target, property, valueUnit, animatable);
          var unit = valueUnit || getUnit(originalValue);
          var to = getRelativeValue(validateValue(value, unit), originalValue);
          var animType = getAnimationType(target, property);
          setProgressValue[animType](target, property, to, animatable.transforms, true);
        }
      });
    }

    // Animations

    function createAnimation(animatable, prop) {
      var animType = getAnimationType(animatable.target, prop.name);
      if (animType) {
        var tweens = normalizeTweens(prop, animatable);
        var lastTween = tweens[tweens.length - 1];
        return {
          type: animType,
          property: prop.name,
          animatable: animatable,
          tweens: tweens,
          duration: lastTween.end,
          delay: tweens[0].delay,
          endDelay: lastTween.endDelay
        }
      }
    }

    function getAnimations(animatables, properties) {
      return filterArray(flattenArray(animatables.map(function (animatable) {
        return properties.map(function (prop) {
          return createAnimation(animatable, prop);
        });
      })), function (a) { return !is.und(a); });
    }

    // Create Instance

    function getInstanceTimings(animations, tweenSettings) {
      var animLength = animations.length;
      var getTlOffset = function (anim) { return anim.timelineOffset ? anim.timelineOffset : 0; };
      var timings = {};
      timings.duration = animLength ? Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration; })) : tweenSettings.duration;
      timings.delay = animLength ? Math.min.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.delay; })) : tweenSettings.delay;
      timings.endDelay = animLength ? timings.duration - Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration - anim.endDelay; })) : tweenSettings.endDelay;
      return timings;
    }

    var instanceID = 0;

    function createNewInstance(params) {
      var instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
      var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
      var properties = getProperties(tweenSettings, params);
      var animatables = getAnimatables(params.targets);
      var animations = getAnimations(animatables, properties);
      var timings = getInstanceTimings(animations, tweenSettings);
      var id = instanceID;
      instanceID++;
      return mergeObjects(instanceSettings, {
        id: id,
        children: [],
        animatables: animatables,
        animations: animations,
        duration: timings.duration,
        delay: timings.delay,
        endDelay: timings.endDelay
      });
    }

    // Core

    var activeInstances = [];

    var engine = (function () {
      var raf;

      function play() {
        if (!raf && (!isDocumentHidden() || !anime.suspendWhenDocumentHidden) && activeInstances.length > 0) {
          raf = requestAnimationFrame(step);
        }
      }
      function step(t) {
        // memo on algorithm issue:
        // dangerous iteration over mutable `activeInstances`
        // (that collection may be updated from within callbacks of `tick`-ed animation instances)
        var activeInstancesLength = activeInstances.length;
        var i = 0;
        while (i < activeInstancesLength) {
          var activeInstance = activeInstances[i];
          if (!activeInstance.paused) {
            activeInstance.tick(t);
            i++;
          } else {
            activeInstances.splice(i, 1);
            activeInstancesLength--;
          }
        }
        raf = i > 0 ? requestAnimationFrame(step) : undefined;
      }

      function handleVisibilityChange() {
        if (!anime.suspendWhenDocumentHidden) { return; }

        if (isDocumentHidden()) {
          // suspend ticks
          raf = cancelAnimationFrame(raf);
        } else { // is back to active tab
          // first adjust animations to consider the time that ticks were suspended
          activeInstances.forEach(
            function (instance) { return instance ._onDocumentVisibility(); }
          );
          engine();
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      return play;
    })();

    function isDocumentHidden() {
      return !!document && document.hidden;
    }

    // Public Instance

    function anime(params) {
      if ( params === void 0 ) params = {};


      var startTime = 0, lastTime = 0, now = 0;
      var children, childrenLength = 0;
      var resolve = null;

      function makePromise(instance) {
        var promise = window.Promise && new Promise(function (_resolve) { return resolve = _resolve; });
        instance.finished = promise;
        return promise;
      }

      var instance = createNewInstance(params);
      makePromise(instance);

      function toggleInstanceDirection() {
        var direction = instance.direction;
        if (direction !== 'alternate') {
          instance.direction = direction !== 'normal' ? 'normal' : 'reverse';
        }
        instance.reversed = !instance.reversed;
        children.forEach(function (child) { return child.reversed = instance.reversed; });
      }

      function adjustTime(time) {
        return instance.reversed ? instance.duration - time : time;
      }

      function resetTime() {
        startTime = 0;
        lastTime = adjustTime(instance.currentTime) * (1 / anime.speed);
      }

      function seekChild(time, child) {
        if (child) { child.seek(time - child.timelineOffset); }
      }

      function syncInstanceChildren(time) {
        if (!instance.reversePlayback) {
          for (var i = 0; i < childrenLength; i++) { seekChild(time, children[i]); }
        } else {
          for (var i$1 = childrenLength; i$1--;) { seekChild(time, children[i$1]); }
        }
      }

      function setAnimationsProgress(insTime) {
        var i = 0;
        var animations = instance.animations;
        var animationsLength = animations.length;
        while (i < animationsLength) {
          var anim = animations[i];
          var animatable = anim.animatable;
          var tweens = anim.tweens;
          var tweenLength = tweens.length - 1;
          var tween = tweens[tweenLength];
          // Only check for keyframes if there is more than one tween
          if (tweenLength) { tween = filterArray(tweens, function (t) { return (insTime < t.end); })[0] || tween; }
          var elapsed = minMax(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration;
          var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
          var strings = tween.to.strings;
          var round = tween.round;
          var numbers = [];
          var toNumbersLength = tween.to.numbers.length;
          var progress = (void 0);
          for (var n = 0; n < toNumbersLength; n++) {
            var value = (void 0);
            var toNumber = tween.to.numbers[n];
            var fromNumber = tween.from.numbers[n] || 0;
            if (!tween.isPath) {
              value = fromNumber + (eased * (toNumber - fromNumber));
            } else {
              value = getPathProgress(tween.value, eased * toNumber, tween.isPathTargetInsideSVG);
            }
            if (round) {
              if (!(tween.isColor && n > 2)) {
                value = Math.round(value * round) / round;
              }
            }
            numbers.push(value);
          }
          // Manual Array.reduce for better performances
          var stringsLength = strings.length;
          if (!stringsLength) {
            progress = numbers[0];
          } else {
            progress = strings[0];
            for (var s = 0; s < stringsLength; s++) {
              strings[s];
              var b = strings[s + 1];
              var n$1 = numbers[s];
              if (!isNaN(n$1)) {
                if (!b) {
                  progress += n$1 + ' ';
                } else {
                  progress += n$1 + b;
                }
              }
            }
          }
          setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms);
          anim.currentValue = progress;
          i++;
        }
      }

      function setCallback(cb) {
        if (instance[cb] && !instance.passThrough) { instance[cb](instance); }
      }

      function countIteration() {
        if (instance.remaining && instance.remaining !== true) {
          instance.remaining--;
        }
      }

      function setInstanceProgress(engineTime) {
        var insDuration = instance.duration;
        var insDelay = instance.delay;
        var insEndDelay = insDuration - instance.endDelay;
        var insTime = adjustTime(engineTime);
        instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
        instance.reversePlayback = insTime < instance.currentTime;
        if (children) { syncInstanceChildren(insTime); }
        if (!instance.began && instance.currentTime > 0) {
          instance.began = true;
          setCallback('begin');
        }
        if (!instance.loopBegan && instance.currentTime > 0) {
          instance.loopBegan = true;
          setCallback('loopBegin');
        }
        if (insTime <= insDelay && instance.currentTime !== 0) {
          setAnimationsProgress(0);
        }
        if ((insTime >= insEndDelay && instance.currentTime !== insDuration) || !insDuration) {
          setAnimationsProgress(insDuration);
        }
        if (insTime > insDelay && insTime < insEndDelay) {
          if (!instance.changeBegan) {
            instance.changeBegan = true;
            instance.changeCompleted = false;
            setCallback('changeBegin');
          }
          setCallback('change');
          setAnimationsProgress(insTime);
        } else {
          if (instance.changeBegan) {
            instance.changeCompleted = true;
            instance.changeBegan = false;
            setCallback('changeComplete');
          }
        }
        instance.currentTime = minMax(insTime, 0, insDuration);
        if (instance.began) { setCallback('update'); }
        if (engineTime >= insDuration) {
          lastTime = 0;
          countIteration();
          if (!instance.remaining) {
            instance.paused = true;
            if (!instance.completed) {
              instance.completed = true;
              setCallback('loopComplete');
              setCallback('complete');
              if (!instance.passThrough && 'Promise' in window) {
                resolve();
                makePromise(instance);
              }
            }
          } else {
            startTime = now;
            setCallback('loopComplete');
            instance.loopBegan = false;
            if (instance.direction === 'alternate') {
              toggleInstanceDirection();
            }
          }
        }
      }

      instance.reset = function() {
        var direction = instance.direction;
        instance.passThrough = false;
        instance.currentTime = 0;
        instance.progress = 0;
        instance.paused = true;
        instance.began = false;
        instance.loopBegan = false;
        instance.changeBegan = false;
        instance.completed = false;
        instance.changeCompleted = false;
        instance.reversePlayback = false;
        instance.reversed = direction === 'reverse';
        instance.remaining = instance.loop;
        children = instance.children;
        childrenLength = children.length;
        for (var i = childrenLength; i--;) { instance.children[i].reset(); }
        if (instance.reversed && instance.loop !== true || (direction === 'alternate' && instance.loop === 1)) { instance.remaining++; }
        setAnimationsProgress(instance.reversed ? instance.duration : 0);
      };

      // internal method (for engine) to adjust animation timings before restoring engine ticks (rAF)
      instance._onDocumentVisibility = resetTime;

      // Set Value helper

      instance.set = function(targets, properties) {
        setTargetsValue(targets, properties);
        return instance;
      };

      instance.tick = function(t) {
        now = t;
        if (!startTime) { startTime = now; }
        setInstanceProgress((now + (lastTime - startTime)) * anime.speed);
      };

      instance.seek = function(time) {
        setInstanceProgress(adjustTime(time));
      };

      instance.pause = function() {
        instance.paused = true;
        resetTime();
      };

      instance.play = function() {
        if (!instance.paused) { return; }
        if (instance.completed) { instance.reset(); }
        instance.paused = false;
        activeInstances.push(instance);
        resetTime();
        engine();
      };

      instance.reverse = function() {
        toggleInstanceDirection();
        instance.completed = instance.reversed ? false : true;
        resetTime();
      };

      instance.restart = function() {
        instance.reset();
        instance.play();
      };

      instance.remove = function(targets) {
        var targetsArray = parseTargets(targets);
        removeTargetsFromInstance(targetsArray, instance);
      };

      instance.reset();

      if (instance.autoplay) { instance.play(); }

      return instance;

    }

    // Remove targets from animation

    function removeTargetsFromAnimations(targetsArray, animations) {
      for (var a = animations.length; a--;) {
        if (arrayContains(targetsArray, animations[a].animatable.target)) {
          animations.splice(a, 1);
        }
      }
    }

    function removeTargetsFromInstance(targetsArray, instance) {
      var animations = instance.animations;
      var children = instance.children;
      removeTargetsFromAnimations(targetsArray, animations);
      for (var c = children.length; c--;) {
        var child = children[c];
        var childAnimations = child.animations;
        removeTargetsFromAnimations(targetsArray, childAnimations);
        if (!childAnimations.length && !child.children.length) { children.splice(c, 1); }
      }
      if (!animations.length && !children.length) { instance.pause(); }
    }

    function removeTargetsFromActiveInstances(targets) {
      var targetsArray = parseTargets(targets);
      for (var i = activeInstances.length; i--;) {
        var instance = activeInstances[i];
        removeTargetsFromInstance(targetsArray, instance);
      }
    }

    // Stagger helpers

    function stagger(val, params) {
      if ( params === void 0 ) params = {};

      var direction = params.direction || 'normal';
      var easing = params.easing ? parseEasings(params.easing) : null;
      var grid = params.grid;
      var axis = params.axis;
      var fromIndex = params.from || 0;
      var fromFirst = fromIndex === 'first';
      var fromCenter = fromIndex === 'center';
      var fromLast = fromIndex === 'last';
      var isRange = is.arr(val);
      var val1 = isRange ? parseFloat(val[0]) : parseFloat(val);
      var val2 = isRange ? parseFloat(val[1]) : 0;
      var unit = getUnit(isRange ? val[1] : val) || 0;
      var start = params.start || 0 + (isRange ? val1 : 0);
      var values = [];
      var maxValue = 0;
      return function (el, i, t) {
        if (fromFirst) { fromIndex = 0; }
        if (fromCenter) { fromIndex = (t - 1) / 2; }
        if (fromLast) { fromIndex = t - 1; }
        if (!values.length) {
          for (var index = 0; index < t; index++) {
            if (!grid) {
              values.push(Math.abs(fromIndex - index));
            } else {
              var fromX = !fromCenter ? fromIndex%grid[0] : (grid[0]-1)/2;
              var fromY = !fromCenter ? Math.floor(fromIndex/grid[0]) : (grid[1]-1)/2;
              var toX = index%grid[0];
              var toY = Math.floor(index/grid[0]);
              var distanceX = fromX - toX;
              var distanceY = fromY - toY;
              var value = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
              if (axis === 'x') { value = -distanceX; }
              if (axis === 'y') { value = -distanceY; }
              values.push(value);
            }
            maxValue = Math.max.apply(Math, values);
          }
          if (easing) { values = values.map(function (val) { return easing(val / maxValue) * maxValue; }); }
          if (direction === 'reverse') { values = values.map(function (val) { return axis ? (val < 0) ? val * -1 : -val : Math.abs(maxValue - val); }); }
        }
        var spacing = isRange ? (val2 - val1) / maxValue : val1;
        return start + (spacing * (Math.round(values[i] * 100) / 100)) + unit;
      }
    }

    // Timeline

    function timeline(params) {
      if ( params === void 0 ) params = {};

      var tl = anime(params);
      tl.duration = 0;
      tl.add = function(instanceParams, timelineOffset) {
        var tlIndex = activeInstances.indexOf(tl);
        var children = tl.children;
        if (tlIndex > -1) { activeInstances.splice(tlIndex, 1); }
        function passThrough(ins) { ins.passThrough = true; }
        for (var i = 0; i < children.length; i++) { passThrough(children[i]); }
        var insParams = mergeObjects(instanceParams, replaceObjectProps(defaultTweenSettings, params));
        insParams.targets = insParams.targets || params.targets;
        var tlDuration = tl.duration;
        insParams.autoplay = false;
        insParams.direction = tl.direction;
        insParams.timelineOffset = is.und(timelineOffset) ? tlDuration : getRelativeValue(timelineOffset, tlDuration);
        passThrough(tl);
        tl.seek(insParams.timelineOffset);
        var ins = anime(insParams);
        passThrough(ins);
        children.push(ins);
        var timings = getInstanceTimings(children, params);
        tl.delay = timings.delay;
        tl.endDelay = timings.endDelay;
        tl.duration = timings.duration;
        tl.seek(0);
        tl.reset();
        if (tl.autoplay) { tl.play(); }
        return tl;
      };
      return tl;
    }

    anime.version = '3.2.1';
    anime.speed = 1;
    // TODO:#review: naming, documentation
    anime.suspendWhenDocumentHidden = true;
    anime.running = activeInstances;
    anime.remove = removeTargetsFromActiveInstances;
    anime.get = getOriginalTargetValue;
    anime.set = setTargetsValue;
    anime.convertPx = convertPxToUnit;
    anime.path = getPath;
    anime.setDashoffset = setDashoffset;
    anime.stagger = stagger;
    anime.timeline = timeline;
    anime.easing = parseEasings;
    anime.penner = penner;
    anime.random = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

    /* src\core\Congrats.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\core\\Congrats.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[8] = list;
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (61:4) {#each stars as star}
    function create_each_block(ctx) {
    	let div;
    	let svg;
    	let polygon;
    	let polygon_fill_value;
    	let polygon_stroke_value;
    	let t;
    	let each_value = /*each_value*/ ctx[8];
    	let star_index = /*star_index*/ ctx[9];
    	const assign_div = () => /*div_binding*/ ctx[5](div, each_value, star_index);
    	const unassign_div = () => /*div_binding*/ ctx[5](null, each_value, star_index);

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			polygon = svg_element("polygon");
    			t = space();
    			attr_dev(polygon, "fill", polygon_fill_value = /*star*/ ctx[7].color);
    			attr_dev(polygon, "stroke", polygon_stroke_value = /*star*/ ctx[7].color);
    			attr_dev(polygon, "stroke-width", "37.6152");
    			attr_dev(polygon, "stroke-linecap", "round");
    			attr_dev(polygon, "stroke-linejoin", "round");
    			attr_dev(polygon, "stroke-miterlimit", "10");
    			attr_dev(polygon, "points", "259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 \r\n                            401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 \r\n                            29.274,197.007 188.165,173.919");
    			add_location(polygon, file$2, 71, 16, 1912);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$2, 69, 12, 1814);
    			attr_dev(div, "class", "box svelte-1nasn8");
    			set_style(div, "--size", /*config*/ ctx[2].size + "px");
    			set_style(div, "--left", /*config*/ ctx[2].pos[0] + "px");
    			set_style(div, "--top", /*config*/ ctx[2].pos[1] + "px");
    			add_location(div, file$2, 61, 8, 1574);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, polygon);
    			append_dev(div, t);
    			assign_div();
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*stars*/ 1 && polygon_fill_value !== (polygon_fill_value = /*star*/ ctx[7].color)) {
    				attr_dev(polygon, "fill", polygon_fill_value);
    			}

    			if (dirty & /*stars*/ 1 && polygon_stroke_value !== (polygon_stroke_value = /*star*/ ctx[7].color)) {
    				attr_dev(polygon, "stroke", polygon_stroke_value);
    			}

    			if (each_value !== /*each_value*/ ctx[8] || star_index !== /*star_index*/ ctx[9]) {
    				unassign_div();
    				each_value = /*each_value*/ ctx[8];
    				star_index = /*star_index*/ ctx[9];
    				assign_div();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			unassign_div();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(61:4) {#each stars as star}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let each_value = /*stars*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "svelte-1nasn8");
    			toggle_class(div, "hidden", /*hidden*/ ctx[1]);
    			add_location(div, file$2, 59, 0, 1519);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*config, stars*/ 5) {
    				each_value = /*stars*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*hidden*/ 2) {
    				toggle_class(div, "hidden", /*hidden*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Congrats", slots, []);

    	let config = {
    		size: 25,
    		pos: [100, 120],
    		xSeed: [20, 100],
    		ySeed: [20, 120],
    		duration: 1500
    	};

    	let stars;
    	let hidden = true;

    	function reset() {
    		anime({
    			targets: stars.map(star => star.box),
    			translateX: 0,
    			translateY: 0,
    			rotate: 0,
    			opacity: 1,
    			duration: 0
    		});
    	}

    	function play() {
    		let delay = () => rand(150, 300);
    		let translateX = () => randFrom([1, -1]) * (config.xSeed[0] + rand(0, config.xSeed[1]));
    		let translateY = () => randFrom([1, -1]) * (config.ySeed[0] + rand(0, config.ySeed[1]));
    		let rotate = () => rand(200, 360);
    		let scale = () => 1 + rand(1, 10) / 10;
    		reset();
    		$$invalidate(1, hidden = false);

    		anime({
    			targets: stars.map(star => star.box),
    			translateX,
    			translateY,
    			rotate,
    			scale,
    			delay,
    			opacity: {
    				value: 0,
    				easing: "linear",
    				delay: config.duration - 200,
    				duration: 500
    			},
    			easing: "easeOutElastic",
    			duration: config.duration,
    			complete: () => $$invalidate(1, hidden = true)
    		});
    	}

    	let { noOfStars = 20 } = $$props;

    	stars = range(0, noOfStars).map(() => {
    		return {
    			box: undefined,
    			color: randFrom(["yellow", "orange", "red"])
    		};
    	});

    	onMount(reset);
    	const writable_props = ["noOfStars"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Congrats> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value, each_value, star_index) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			each_value[star_index].box = $$value;
    			$$invalidate(0, stars);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("noOfStars" in $$props) $$invalidate(4, noOfStars = $$props.noOfStars);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		rand,
    		randFrom,
    		range,
    		anime,
    		config,
    		stars,
    		hidden,
    		reset,
    		play,
    		noOfStars
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(2, config = $$props.config);
    		if ("stars" in $$props) $$invalidate(0, stars = $$props.stars);
    		if ("hidden" in $$props) $$invalidate(1, hidden = $$props.hidden);
    		if ("noOfStars" in $$props) $$invalidate(4, noOfStars = $$props.noOfStars);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [stars, hidden, config, play, noOfStars, div_binding];
    }

    class Congrats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { play: 3, noOfStars: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Congrats",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get play() {
    		return this.$$.ctx[3];
    	}

    	set play(value) {
    		throw new Error("<Congrats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noOfStars() {
    		throw new Error("<Congrats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noOfStars(value) {
    		throw new Error("<Congrats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Main.svelte generated by Svelte v3.38.3 */

    // (42:0) <Grid {layout}>
    function create_default_slot(ctx) {
    	let pair;
    	let t0;
    	let digit;
    	let t1;
    	let clock;
    	let t2;
    	let num0;
    	let t3;
    	let op;
    	let t4;
    	let num1;
    	let t5;
    	let ans0;
    	let t6;
    	let ans1;
    	let t7;
    	let ans2;
    	let t8;
    	let count;
    	let t9;
    	let congrats_1;
    	let current;

    	pair = new Pair({
    			props: {
    				ga: "p1",
    				pair: PlusOver.getPair(),
    				bgColor: "bg-yellow-100"
    			},
    			$$inline: true
    		});

    	digit = new Digit({
    			props: { ga: "p2", bgColor: "bg-pink-100" },
    			$$inline: true
    		});

    	clock = new Clock({
    			props: {
    				ga: "clk",
    				soundOn: /*_settings*/ ctx[2].soundOn
    			},
    			$$inline: true
    		});

    	num0 = new Num({
    			props: {
    				ga: "lhs",
    				index: 0,
    				bgColor: "bg-green-100"
    			},
    			$$inline: true
    		});

    	op = new Op({
    			props: { ga: "op", bgColor: "bg-yellow-300" },
    			$$inline: true
    		});

    	num1 = new Num({
    			props: {
    				ga: "rhs",
    				index: 1,
    				bgColor: "bg-green-100"
    			},
    			$$inline: true
    		});

    	ans0 = new Ans({
    			props: { ga: "a1", index: 0 },
    			$$inline: true
    		});

    	ans1 = new Ans({
    			props: { ga: "a2", index: 1 },
    			$$inline: true
    		});

    	ans2 = new Ans({
    			props: { ga: "a3", index: 2 },
    			$$inline: true
    		});

    	count = new Count({ props: { ga: "cnt" }, $$inline: true });

    	let congrats_1_props = {
    		noOfStars: /*_settings*/ ctx[2].noOfStarsAtCongrats
    	};

    	congrats_1 = new Congrats({ props: congrats_1_props, $$inline: true });
    	/*congrats_1_binding*/ ctx[3](congrats_1);

    	const block = {
    		c: function create() {
    			create_component(pair.$$.fragment);
    			t0 = space();
    			create_component(digit.$$.fragment);
    			t1 = space();
    			create_component(clock.$$.fragment);
    			t2 = space();
    			create_component(num0.$$.fragment);
    			t3 = space();
    			create_component(op.$$.fragment);
    			t4 = space();
    			create_component(num1.$$.fragment);
    			t5 = space();
    			create_component(ans0.$$.fragment);
    			t6 = space();
    			create_component(ans1.$$.fragment);
    			t7 = space();
    			create_component(ans2.$$.fragment);
    			t8 = space();
    			create_component(count.$$.fragment);
    			t9 = space();
    			create_component(congrats_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(pair, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(digit, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(clock, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(num0, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(op, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(num1, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(ans0, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(ans1, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(ans2, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(count, target, anchor);
    			insert_dev(target, t9, anchor);
    			mount_component(congrats_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const congrats_1_changes = {};
    			congrats_1.$set(congrats_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pair.$$.fragment, local);
    			transition_in(digit.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			transition_in(num0.$$.fragment, local);
    			transition_in(op.$$.fragment, local);
    			transition_in(num1.$$.fragment, local);
    			transition_in(ans0.$$.fragment, local);
    			transition_in(ans1.$$.fragment, local);
    			transition_in(ans2.$$.fragment, local);
    			transition_in(count.$$.fragment, local);
    			transition_in(congrats_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pair.$$.fragment, local);
    			transition_out(digit.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			transition_out(num0.$$.fragment, local);
    			transition_out(op.$$.fragment, local);
    			transition_out(num1.$$.fragment, local);
    			transition_out(ans0.$$.fragment, local);
    			transition_out(ans1.$$.fragment, local);
    			transition_out(ans2.$$.fragment, local);
    			transition_out(count.$$.fragment, local);
    			transition_out(congrats_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(pair, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(digit, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(clock, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(num0, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(op, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(num1, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(ans0, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(ans1, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(ans2, detaching);
    			if (detaching) detach_dev(t8);
    			destroy_component(count, detaching);
    			if (detaching) detach_dev(t9);
    			/*congrats_1_binding*/ ctx[3](null);
    			destroy_component(congrats_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(42:0) <Grid {layout}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[1],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, congrats*/ 33) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	let congrats;

    	function done() {
    		congrats.play();
    		PlusOver.done();
    	}

    	on("--cmd-new-round", () => PlusOver.newRound());
    	on("--evt-answer", args => PlusOver.gotAnswer(args));
    	on("--evt-click", () => PlusOver.gotClicked());
    	on("--evt-done", () => done());
    	on("--evt-yes", () => PlusOver.yes());
    	on("--evt-no", () => PlusOver.no());
    	on("--cmd-idle", () => PlusOver.idle());
    	on("--cmd-sound", args => PlusOver.soundSwitch(args));
    	fire("--cmd-new-round");

    	let layout = {
    		areas: `
            "cnt   p1   clk "
            "cnt   p2   clk "
            "lhs   op   rhs "
            "a1    a2   a3  "
        `,
    		cols: `1fr 1fr 1fr`,
    		rows: `30px 30px 100px 100px`
    	};

    	let _settings = Settings;
    	Mp3.buildMp3Library(_settings.assetsFolder, _settings.soundOn);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	function congrats_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			congrats = $$value;
    			$$invalidate(0, congrats);
    		});
    	}

    	$$self.$capture_state = () => ({
    		Grid,
    		Clock,
    		Mp3,
    		Settings,
    		self: PlusOver,
    		on,
    		fire,
    		Count,
    		Num,
    		Op,
    		Ans,
    		Pair,
    		Digit,
    		Congrats,
    		congrats,
    		done,
    		layout,
    		_settings
    	});

    	$$self.$inject_state = $$props => {
    		if ("congrats" in $$props) $$invalidate(0, congrats = $$props.congrats);
    		if ("layout" in $$props) $$invalidate(1, layout = $$props.layout);
    		if ("_settings" in $$props) $$invalidate(2, _settings = $$props._settings);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [congrats, layout, _settings, congrats_1_binding];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\minus-over\MinusOver.svelte generated by Svelte v3.38.3 */

    const file$1 = "src\\minus-over\\MinusOver.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Hello there";
    			add_location(div, file$1, 2, 0, 29);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MinusOver", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MinusOver> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class MinusOver extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MinusOver",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\core\Oops.svelte generated by Svelte v3.38.3 */

    const file = "src\\core\\Oops.svelte";

    function create_fragment$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Oops...";
    			add_location(p, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Oops", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Oops> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Oops extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Oops",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\core\MathJax.svelte generated by Svelte v3.38.3 */

    var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    	function adopt(value) {
    		return value instanceof P
    		? value
    		: new P(function (resolve) {
    					resolve(value);
    				});
    	}

    	return new (P || (P = Promise))(function (resolve, reject) {
    			function fulfilled(value) {
    				try {
    					step(generator.next(value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function rejected(value) {
    				try {
    					step(generator["throw"](value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function step(result) {
    				result.done
    				? resolve(result.value)
    				: adopt(result.value).then(fulfilled, rejected);
    			}

    			step((generator = generator.apply(thisArg, _arguments || [])).next());
    		});
    };

    function refreshMath() {
    	function doIt() {
    		return __awaiter(this, void 0, void 0, function* () {
    			yield delay(2000);
    		}); //safe(() => MathJax.typeset());
    	}

    	run(doIt);
    }

    /* src\App.svelte generated by Svelte v3.38.3 */

    function create_fragment(ctx) {
    	let switch_instance;
    	let t;
    	let logger;
    	let current;
    	var switch_value = /*loadGame*/ ctx[0]();

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	logger = new Logger({ $$inline: true });

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t = space();
    			create_component(logger.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			mount_component(logger, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (switch_value !== (switch_value = /*loadGame*/ ctx[0]())) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, t.parentNode, t);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			transition_in(logger.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			transition_out(logger.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(logger, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	onMount(() => {
    		Anki.hideLoader();
    		refreshMath();
    	});

    	function loadGame() {
    		try {
    			let card = Anki.getCard();
    			let config = JSON.parse(card.config);

    			switch (config.game) {
    				case "plus-over":
    					return Main;
    				case "minus-over":
    					return MinusOver;
    				default:
    					error(`Unknown game type: '${config.game}'`);
    					return Oops;
    			}
    		} catch(err) {
    			error("Failed to loadGame", err);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		PlusOver: Main,
    		MinusOver,
    		Oops,
    		Logger,
    		error,
    		Anki,
    		refreshMath,
    		loadGame
    	});

    	return [loadGame];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
